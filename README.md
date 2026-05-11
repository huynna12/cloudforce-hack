**Live at:** 
[https://cloudforce-hack.vercel.app/](https://cloudforce-hack.vercel.app/)

## Overview
Turn any YouTube lecture into a complete study environment — or a private faculty audit — in under 60 seconds.
Built for [The Frontier Internship](https://www.cloudforcehq.com/) — Cloudforce Hackathon, May 2025.

## Capabilities

### 🎓 Capability 1 — Student *(implemented)*

A college student pastes a lecture URL. Heidi turns it into a complete personalized study environment:

| Feature | Description |
|---|---|
| **Outline** | Hierarchical structure with clickable timestamps that seek directly into the video |
| **Summaries** | Three depths — 90-second, 5-minute, and full detail |
| **Flashcards** | Auto-generated Q&A cards with source citations and formula rendering |
| **Key Terms** | Definitions extracted from the lecture, categorized and filterable |
| **Ask** | Ask any question — get an AI explanation + the exact moments in the video that address it |
| **Translation** | All study materials translated to 11 languages with one click |

### 🔍 Capability 2 — Faculty *(implemented)*

A faculty member pastes their own lecture URL. Heidi audits it across pedagogical, accessibility, equity, and clarity dimensions and produces a **private report** with:

- A prioritized fix list — *"if you change one thing before publishing, change this"*
- Specific timestamped suggested rewrites
- Scores across clarity, pacing, structure, and inclusivity

The report is explicitly for the faculty member only — this is a tool for self-improvement, not surveillance.


## Agent Architecture

The app runs a multi-agent backend with five distinct agents, each with a genuinely different job:

```
YouTube URL
    │
    ▼
┌──────────────────────────────────────────────────┐
│                  FastAPI Backend                  │
│                                                  │
│  TranscriptAgent                                 │
│  ── fetches transcript, validates content,       │
│     rejects music/shorts/private/too-short       │
│                        │                         │
│                        ▼                         │
│  OutlineAgent ──┐  (parallel via asyncio.gather) │
│  SynthesisAgent─┘                                │
│  ── outline, summaries, flashcards, key terms    │
│                                                  │
│  AskAgent         (on demand, per question)       │
│  ── runs semantic search + AI explanation in     │
│     parallel; returns grounded answer + source   │
│     moments with clickable timestamps            │
│                                                  │
│  FacultyAgent     (on demand, faculty route)     │
│  ── pedagogical audit → structured report        │
└──────────────────────────────────────────────────┘
    │
    ▼  Server-Sent Events (SSE) stream
┌─────────────────────┐
│  Next.js Frontend   │
│  (Vercel)           │
└─────────────────────┘
```

**Key techniques**
- Parallel pipeline — `OutlineAgent` and `SynthesisAgent` run simultaneously via `asyncio.gather`, cutting latency roughly in half
- Prompt caching (`cache_control: ephemeral`) on transcripts — the full transcript is cached on Claude's side so every subsequent agent call skips re-ingestion
- Server-sent events (SSE) for real-time progress streaming — users see live status as each agent completes
- Session persistence to disk — sessions survive backend restarts so Ask and Search remain functional across the judging window
- Pre-fetched metadata — YouTube metadata is validated once on `/api/process`, then passed through the pipeline to avoid duplicate API calls


## Tech Stack

**Frontend** — Next.js 16, TypeScript, Tailwind CSS, deployed on Vercel

**Backend** — FastAPI, Python 3.11, deployed on Fly.io (always-on, 1 GB RAM, persistent volume)

**AI** — Anthropic Claude
- `claude-sonnet-4-5` — outline, summaries, flashcards, key terms, tutor, faculty audit
- `claude-haiku-4-5` — semantic search (speed-optimized)

## Validation Layers

The app rejects invalid input before any AI processing begins:

- Non-YouTube URLs caught on the frontend before any API call
- YouTube Shorts, private videos, age-restricted videos → clear error on the homepage
- Music videos detected via YouTube category API + title heuristics + transcript noise ratio
- Videos under 2 minutes or fewer than 80 words of speech → rejected
- All errors surface on the homepage — users never navigate to a broken state

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Anthropic API key

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Create .env
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

**Backend → Fly.io**

```bash
cd backend
fly auth login
fly volumes create <your-app-name> --region iad --size 1
fly secrets set ANTHROPIC_API_KEY=<your-api-key>
fly deploy
```

**Frontend → Vercel**

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Set root directory to `frontend`
4. Add environment variable: `NEXT_PUBLIC_API_URL=https://<your-app-name>.fly.dev`
5. Deploy
