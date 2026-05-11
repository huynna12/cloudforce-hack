# Heidi

**Turn any YouTube lecture into a complete study environment — in under 60 seconds.**

Paste a lecture URL. Heidi fetches the transcript, runs a parallel AI pipeline, and gives you a structured outline, multi-depth summaries, flashcards, key terms, and an AI tutor — all grounded in what the professor actually said.

---

## Features

| Feature | Description |
|---|---|
| **Outline** | Hierarchical structure with clickable timestamps that seek the video |
| **Summaries** | Three depths — 90-second, 5-minute, and full detail |
| **Flashcards** | Auto-generated Q&A cards with source citations and formula rendering |
| **Key Terms** | Definitions extracted from the lecture, categorized and filterable |
| **Ask** | Ask any question — get an AI explanation + the exact moments in the video that cover it |
| **Translation** | All study materials translated to 11 languages with one click |
| **Faculty Audit** | Educators can run a content quality report on their own lectures |

---

## Tech Stack

**Frontend** — Next.js 14, TypeScript, Tailwind CSS, deployed on Vercel

**Backend** — FastAPI, Python 3.11, deployed on Fly.io

**AI** — Anthropic Claude (claude-sonnet-4-5 for outlines, summaries, flashcards, key terms, tutor · claude-haiku-4-5 for search)

**Key techniques**
- Parallel agent pipeline — outline and synthesis run simultaneously via `asyncio.gather`
- Prompt caching (`cache_control: ephemeral`) on transcripts to reduce latency and cost
- Server-sent events (SSE) for real-time progress streaming to the frontend
- Session persistence to disk so Search and Ask survive backend restarts

---

## Architecture

```
YouTube URL
    │
    ▼
┌─────────────────────────────────────────┐
│              FastAPI Backend             │
│                                         │
│  TranscriptAgent  ──────────────────┐  │
│  (fetch + validate transcript)       │  │
│                                      ▼  │
│  OutlineAgent  ┐                        │
│  (parallel)    ├──► Study Materials │  │
│  SynthesisAgent┘    (outline,       │  │
│  (parallel)         summaries,      │  │
│                     flashcards,     │  │
│  SearchAgent        key_terms)      │  │
│  (on demand)                        │  │
│                                     │  │
│  TutorAgent                         │  │
│  (on demand)                        │  │
└─────────────────────────────────────────┘
    │
    ▼  SSE stream
┌─────────────────┐
│  Next.js Frontend│
│  (Vercel)        │
└─────────────────┘
```

---

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

---

## Deployment

**Backend → Fly.io**

```bash
cd backend
fly auth login
fly volumes create heidi_data --region iad --size 1
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly deploy
```

**Frontend → Vercel**

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Set root directory to `frontend`
4. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-app.fly.dev`
5. Deploy

---

## Validation layers

Heidi rejects invalid input before any AI processing begins:

- Non-YouTube URLs caught on the frontend before any API call
- YouTube Shorts, private videos, age-restricted videos → clear error on the homepage
- Music videos detected via YouTube category API + title heuristics + transcript noise ratio
- Videos under 2 minutes or with fewer than 80 words of speech → rejected
- All errors surface on the homepage — users never navigate to a broken state

---

## Built for

[The Frontier Internship](https://www.cloudforcehq.com/) — Cloudforce Hackathon, May 2025
