import asyncio
import uuid
from typing import AsyncGenerator

from agents.transcript_agent import TranscriptAgent
from agents.outline_agent import OutlineAgent
from agents.synthesis_agent import SynthesisAgent
from agents.search_agent import SearchAgent
from agents.translation_agent import TranslationAgent
from agents.tutor_agent import TutorAgent


class Orchestrator:
    """
    Manages the full agent pipeline.

    Flow:
      1. TranscriptAgent  — fetches YouTube data (no LLM)
      2. OutlineAgent     — Claude Sonnet, cached transcript
      3. SynthesisAgent   — Claude Sonnet, cached transcript (parallel with Outline)
      4. SearchAgent      — Claude Haiku, cached transcript (on demand)
      5. TranslationAgent — Claude Haiku (on demand)

    Sessions are stored in memory. Fine for judging scale (3–10 videos).
    """

    def __init__(self, anthropic_api_key: str):
        self.transcript_agent = TranscriptAgent()
        self.outline_agent = OutlineAgent(anthropic_api_key)
        self.synthesis_agent = SynthesisAgent(anthropic_api_key)
        self.search_agent = SearchAgent(anthropic_api_key)
        self.translation_agent = TranslationAgent(anthropic_api_key)
        self.tutor_agent = TutorAgent(anthropic_api_key)

        # session_id -> {"status", "metadata", "transcript_text", "study_materials", "error"}
        self._sessions: dict[str, dict] = {}
        # session_id -> asyncio.Queue of SSE events
        self._queues: dict[str, asyncio.Queue] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def create_session(self, youtube_url: str) -> str:
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = {
            "status": "processing",
            "metadata": None,
            "transcript_text": None,
            "study_materials": None,
            "error": None,
        }
        self._queues[session_id] = asyncio.Queue()
        asyncio.create_task(self._run(session_id, youtube_url))
        return session_id

    async def stream_events(self, session_id: str) -> AsyncGenerator[dict, None]:
        queue = self._queues.get(session_id)
        if queue is None:
            yield {"type": "error", "error": "Session not found"}
            return

        while True:
            event = await queue.get()
            if event is None:  # sentinel — pipeline finished
                break
            yield event

    async def search(self, session_id: str, query: str) -> list:
        session = self._get_complete_session(session_id)
        return await self.search_agent.search(
            session["transcript_text"],
            session["metadata"]["title"],
            query,
        )

    async def tutor(self, session_id: str, question: str, history: list[dict]) -> str:
        session = self._get_complete_session(session_id)
        return await self.tutor_agent.answer(
            session["transcript_text"],
            session["metadata"]["title"],
            question,
            history,
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

    async def _run(self, session_id: str, youtube_url: str) -> None:
        session = self._sessions[session_id]
        queue = self._queues[session_id]

        try:
            # ── Step 1: Transcript ──────────────────────────────────────
            await queue.put({"type": "progress", "agent": "transcript", "status": "running"})
            transcript_data = await self.transcript_agent.run(youtube_url)
            session["metadata"] = transcript_data["metadata"]
            session["transcript_text"] = transcript_data["transcript_text"]
            await queue.put({
                "type": "progress",
                "agent": "transcript",
                "status": "complete",
                "data": transcript_data["metadata"],
            })

            # ── Step 2: Outline + Synthesis in parallel ─────────────────
            await queue.put({"type": "progress", "agent": "outline", "status": "running"})
            await queue.put({"type": "progress", "agent": "synthesis", "status": "running"})

            outline, synthesis = await asyncio.gather(
                self.outline_agent.run(transcript_data["transcript_text"], transcript_data["metadata"]["title"]),
                self.synthesis_agent.run(transcript_data["transcript_text"], transcript_data["metadata"]["title"]),
            )

            study_materials = {
                "outline": outline,
                "summaries": synthesis["summaries"],
                "flashcards": synthesis["flashcards"],
                "key_terms": synthesis["key_terms"],
            }
            session["study_materials"] = study_materials

            await queue.put({"type": "progress", "agent": "outline", "status": "complete"})
            await queue.put({"type": "progress", "agent": "synthesis", "status": "complete"})

            # ── Done ────────────────────────────────────────────────────
            session["status"] = "complete"
            await queue.put({
                "type": "complete",
                "data": {
                    "metadata": session["metadata"],
                    "study_materials": study_materials,
                },
            })

        except Exception as exc:
            session["status"] = "error"
            session["error"] = str(exc)
            await queue.put({"type": "error", "error": str(exc)})

        finally:
            await queue.put(None)  # sentinel

    def _get_complete_session(self, session_id: str) -> dict:
        session = self._sessions.get(session_id)
        if session is None:
            raise ValueError("Session not found.")
        if session["status"] != "complete":
            raise ValueError("Session is not complete yet.")
        return session
