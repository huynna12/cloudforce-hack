import asyncio
import json
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pydantic_settings import BaseSettings

from agents.orchestrator import Orchestrator
from agents.transcript_agent import TranscriptAgent
from agents.audit_agent import AuditAgent


class Settings(BaseSettings):
    anthropic_api_key: str
    gemini_api_key: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()

app = FastAPI(title="LectureLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your Vercel domain before final deploy
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = Orchestrator(settings.anthropic_api_key)

# ── Faculty sessions (in-memory, same pattern as student sessions) ───────────
_transcript_agent = TranscriptAgent()
_audit_agent = AuditAgent(settings.anthropic_api_key)
_faculty_sessions: dict[str, dict] = {}
_faculty_queues: dict[str, asyncio.Queue] = {}


async def _run_faculty_pipeline(session_id: str, youtube_url: str) -> None:
    session = _faculty_sessions[session_id]
    queue = _faculty_queues[session_id]
    try:
        await queue.put({"type": "progress", "step": "transcript", "status": "running"})
        transcript_data = await _transcript_agent.run(youtube_url)
        session["metadata"] = transcript_data["metadata"]
        await queue.put({
            "type": "progress", "step": "transcript", "status": "complete",
            "data": transcript_data["metadata"],
        })

        await queue.put({"type": "progress", "step": "audit", "status": "running"})
        report = await _audit_agent.run(
            transcript_data["transcript_text"],
            transcript_data["metadata"]["title"],
        )
        session["report"] = report
        session["status"] = "complete"
        await queue.put({
            "type": "complete",
            "data": {"metadata": session["metadata"], "report": report},
        })
    except Exception as exc:
        session["status"] = "error"
        session["error"] = str(exc)
        await queue.put({"type": "error", "error": str(exc)})
    finally:
        await queue.put(None)  # sentinel


# ── Request models ──────────────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    youtube_url: str


class SearchRequest(BaseModel):
    query: str


class TranslateRequest(BaseModel):
    language: str
    content_type: str  # "outline" | "summaries" | "flashcards"


class TutorRequest(BaseModel):
    question: str
    history: list[dict] = []


# ── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/process")
async def start_processing(request: ProcessRequest):
    """Create a session and kick off the agent pipeline. Returns session_id immediately."""
    try:
        session_id = orchestrator.create_session(request.youtube_url)
        return {"session_id": session_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/stream/{session_id}")
async def stream_session(session_id: str):
    """SSE endpoint — streams agent progress events until pipeline completes."""

    async def event_generator():
        async for event in orchestrator.stream_events(session_id):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/session/{session_id}")
def get_session(session_id: str):
    """Returns current session state (useful for reconnects)."""
    session = orchestrator.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.post("/api/search/{session_id}")
async def search(session_id: str, request: SearchRequest):
    try:
        results = await orchestrator.search(session_id, request.query)
        return {"results": results}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/tutor/{session_id}")
async def tutor(session_id: str, request: TutorRequest):
    try:
        answer = await orchestrator.tutor(session_id, request.question, request.history)
        return {"answer": answer}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Faculty routes ───────────────────────────────────────────────────────────

@app.post("/api/faculty/process")
async def faculty_process(request: ProcessRequest):
    session_id = str(uuid.uuid4())
    _faculty_sessions[session_id] = {
        "status": "processing", "metadata": None, "report": None, "error": None,
    }
    _faculty_queues[session_id] = asyncio.Queue()
    asyncio.create_task(_run_faculty_pipeline(session_id, request.youtube_url))
    return {"session_id": session_id}


@app.get("/api/faculty/stream/{session_id}")
async def faculty_stream(session_id: str):
    queue = _faculty_queues.get(session_id)
    if queue is None:
        raise HTTPException(status_code=404, detail="Faculty session not found")

    async def event_generator():
        while True:
            event = await queue.get()
            if event is None:
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/faculty/report/{session_id}")
def faculty_report(session_id: str):
    session = _faculty_sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Faculty session not found")
    return session


@app.post("/api/translate/{session_id}")
async def translate(session_id: str, request: TranslateRequest):
    try:
        content = await orchestrator.translate(
            session_id, request.language, request.content_type
        )
        return {"content": content}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
