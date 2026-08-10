import asyncio
import uuid
import json
import os
from typing import AsyncGenerator

from agents.transcript_agent import TranscriptAgent
from agents.outline_agent import OutlineAgent
from agents.synthesis_agent import SynthesisAgent
from agents.search_agent import SearchAgent
from agents.translation_agent import TranslationAgent
from utils.errors import friendly_error

_SESSIONS_FILE = os.environ.get("SESSIONS_FILE", "sessions_store.json")


def _load_sessions() -> dict:
    """Load completed sessions from disk on startup."""
    if not os.path.exists(_SESSIONS_FILE):
        return {}
    try:
        with open(_SESSIONS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_session(session_id: str, session: dict) -> None:
    """Persist a single completed session to disk (atomically)."""
    try:
        store = _load_sessions()
        store[session_id] = session
        # Write to a temp file and rename so a crash mid-write can't corrupt the
        # store — os.replace is atomic on the same filesystem.
        tmp = f"{_SESSIONS_FILE}.tmp"
        with open(tmp, "w") as f:
            json.dump(store, f)
        os.replace(tmp, _SESSIONS_FILE)
    except Exception:
        pass  # never crash the pipeline over a disk write


class Orchestrator:
    """
    Manages the full agent pipeline.

    Flow:
      1. TranscriptAgent  — fetches YouTube data (no LLM)
      2. OutlineAgent     — Claude Sonnet, cached transcript
      3. SynthesisAgent   — Claude Sonnet, cached transcript (parallel with Outline)
      4. SearchAgent      — Claude Haiku, cached transcript (on demand)
      5. TranslationAgent — Claude Haiku (on demand)

    Completed sessions are persisted to disk so Search and Tutor survive backend restarts.
    """

    def __init__(self, anthropic_api_key: str):
        self.transcript_agent = TranscriptAgent()
        self.outline_agent = OutlineAgent(anthropic_api_key)
        self.synthesis_agent = SynthesisAgent(anthropic_api_key)
        self.search_agent = SearchAgent(anthropic_api_key)
        self.translation_agent = TranslationAgent(anthropic_api_key)

        # Restore completed sessions from disk — in-progress ones are gone after restart
        self._sessions: dict[str, dict] = _load_sessions()
        # session_id -> list of subscriber queues (live sessions only). A list, not a
        # single queue, so multiple concurrent stream connections (a refresh, a second
        # tab, a React re-mount) each receive every event instead of competing for one.
        self._subscribers: dict[str, list[asyncio.Queue]] = {}
        # Hold strong references to running pipeline tasks — asyncio keeps only a weak
        # reference, so an unreferenced task can be garbage-collected and cancelled
        # mid-run. Discard each task from the set once it finishes.
        self._tasks: set[asyncio.Task] = set()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def create_session(
        self,
        youtube_url: str,
        metadata: dict | None = None,
        transcript: list | None = None,
        transcript_text: str | None = None,
    ) -> str:
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = {
            "status": "processing",
            "metadata": metadata,
            "transcript_text": transcript_text,
            "study_materials": None,
            "error": None,
        }
        task = asyncio.create_task(
            self._run(session_id, youtube_url, metadata, transcript, transcript_text)
        )
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return session_id

    async def stream_events(self, session_id: str) -> AsyncGenerator[dict, None]:
        session = self._sessions.get(session_id)
        if session is None:
            yield {"type": "error", "error": "Session not found"}
            return

        # Already finished — a reconnect, or a completed session restored from disk
        # after a restart. Replay the terminal event and return instead of blocking
        # on a queue that will never receive another event.
        if session["status"] in ("complete", "error"):
            yield self._terminal_event(session)
            return

        # Live session: subscribe with our own queue so we never compete with another
        # open connection for the same events.
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.setdefault(session_id, []).append(queue)
        try:
            # Guard the race where the pipeline finished between the status check above
            # and our subscription — replay from state rather than hang forever.
            session = self._sessions.get(session_id)
            if session and session["status"] in ("complete", "error"):
                yield self._terminal_event(session)
                return

            while True:
                event = await queue.get()
                if event is None:  # sentinel — pipeline finished
                    break
                yield event
        finally:
            subscribers = self._subscribers.get(session_id)
            if subscribers and queue in subscribers:
                subscribers.remove(queue)
            if subscribers is not None and not subscribers:
                self._subscribers.pop(session_id, None)

    def _terminal_event(self, session: dict) -> dict:
        """Build the final SSE event from persisted session state (for reconnects)."""
        if session["status"] == "error":
            return {"type": "error", "error": session.get("error") or "Processing failed."}
        return {
            "type": "complete",
            "data": {
                "metadata": session["metadata"],
                "study_materials": session["study_materials"],
            },
        }

    def _publish(self, session_id: str, event: dict | None) -> None:
        """Fan an event out to every currently-subscribed stream connection."""
        for queue in list(self._subscribers.get(session_id, [])):
            queue.put_nowait(event)

    async def search(self, session_id: str, query: str) -> list:
        session = self._get_complete_session(session_id)
        return await self.search_agent.search(
            session["transcript_text"],
            session["metadata"]["title"],
            query,
        )

    async def translate(self, session_id: str, language: str, content_type: str) -> any:
        session = self._get_complete_session(session_id)
        content = session["study_materials"].get(content_type)
        if content is None:
            raise ValueError(f"Unknown content type: {content_type}")
        return await self.translation_agent.translate(content, language, content_type)

    def get_session(self, session_id: str) -> dict | None:
        return self._sessions.get(session_id)

    # ------------------------------------------------------------------
    # Internal pipeline
    # ------------------------------------------------------------------

    async def _run(
        self,
        session_id: str,
        youtube_url: str,
        metadata: dict | None = None,
        transcript: list | None = None,
        transcript_text: str | None = None,
    ) -> None:
        session = self._sessions[session_id]

        try:
            # ── Step 1: Transcript ──────────────────────────────────────
            self._publish(session_id, {"type": "progress", "agent": "transcript", "status": "running"})
            transcript_data = await self.transcript_agent.run(
                youtube_url,
                metadata=metadata,
                transcript=transcript,
                transcript_text=transcript_text,
            )
            session["metadata"] = transcript_data["metadata"]
            session["transcript_text"] = transcript_data["transcript_text"]
            self._publish(session_id, {
                "type": "progress",
                "agent": "transcript",
                "status": "complete",
                "data": transcript_data["metadata"],
            })

            # ── Step 2: Outline + Synthesis in parallel ─────────────────
            self._publish(session_id, {"type": "progress", "agent": "outline", "status": "running"})
            self._publish(session_id, {"type": "progress", "agent": "synthesis", "status": "running"})

            outline_result, synthesis_result = await asyncio.gather(
                self.outline_agent.run(transcript_data["transcript_text"], transcript_data["metadata"]["title"]),
                self.synthesis_agent.run(transcript_data["transcript_text"], transcript_data["metadata"]["title"]),
                return_exceptions=True,
            )

            # If both agents failed, this is a genuine failure — surface it. Otherwise
            # degrade gracefully so one broken agent doesn't discard the other's work.
            if isinstance(outline_result, BaseException) and isinstance(synthesis_result, BaseException):
                raise outline_result

            outline = [] if isinstance(outline_result, BaseException) else outline_result
            synthesis = (
                {"summaries": {"brief": "", "medium": "", "full": ""}, "flashcards": [], "key_terms": []}
                if isinstance(synthesis_result, BaseException)
                else synthesis_result
            )

            study_materials = {
                "outline": outline,
                "summaries": synthesis["summaries"],
                "flashcards": synthesis["flashcards"],
                "key_terms": synthesis["key_terms"],
            }
            session["study_materials"] = study_materials

            self._publish(session_id, {"type": "progress", "agent": "outline", "status": "complete"})
            self._publish(session_id, {"type": "progress", "agent": "synthesis", "status": "complete"})

            # ── Done ────────────────────────────────────────────────────
            # Set terminal state and persist BEFORE publishing the complete event, so a
            # stream that connects at this moment sees a terminal status and replays it.
            session["status"] = "complete"
            _save_session(session_id, session)  # persist so restarts don't lose Search/Tutor
            self._publish(session_id, {
                "type": "complete",
                "data": {
                    "metadata": session["metadata"],
                    "study_materials": study_materials,
                },
            })

        except Exception as exc:
            msg = friendly_error(exc)
            session["status"] = "error"
            session["error"] = msg
            self._publish(session_id, {"type": "error", "error": msg})

        finally:
            self._publish(session_id, None)  # sentinel — closes every open stream

    def _get_complete_session(self, session_id: str) -> dict:
        session = self._sessions.get(session_id)
        if session is None:
            raise ValueError("Session not found.")
        if session["status"] != "complete":
            raise ValueError("Session is not complete yet.")
        return session
