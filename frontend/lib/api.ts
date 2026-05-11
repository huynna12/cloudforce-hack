const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function startProcessing(youtubeUrl: string): Promise<{ session_id: string }> {
  const res = await fetch(`${API_BASE}/api/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ youtube_url: youtubeUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Failed to start processing");
  }
  return res.json();
}

export function createEventSource(sessionId: string): EventSource {
  return new EventSource(`${API_BASE}/api/stream/${sessionId}`);
}

export async function searchLecture(
  sessionId: string,
  query: string
): Promise<{ results: import("./types").SearchResult[] }> {
  const res = await fetch(`${API_BASE}/api/search/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Search failed" }));
    throw new Error(err.detail || "Search failed");
  }
  return res.json();
}

export async function translateContent(
  sessionId: string,
  language: string,
  contentType: "outline" | "summaries" | "flashcards" | "key_terms"
): Promise<{ content: unknown }> {
  const res = await fetch(`${API_BASE}/api/translate/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, content_type: contentType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Translation failed" }));
    throw new Error(err.detail || "Translation failed");
  }
  return res.json();
}

export async function askTutor(
  sessionId: string,
  question: string,
  history: { question: string; answer: string }[]
): Promise<{ answer: string }> {
  const res = await fetch(`${API_BASE}/api/tutor/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Tutor failed" }));
    throw new Error(err.detail || "Tutor failed");
  }
  return res.json();
}

export async function getSession(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/session/${sessionId}`);
  if (!res.ok) return null;
  return res.json();
}

// ── Faculty ──────────────────────────────────────────────────────────────────

export async function startFacultyProcessing(youtubeUrl: string): Promise<{ session_id: string }> {
  const res = await fetch(`${API_BASE}/api/faculty/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ youtube_url: youtubeUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Failed to start analysis");
  }
  return res.json();
}

export function createFacultyEventSource(sessionId: string): EventSource {
  return new EventSource(`${API_BASE}/api/faculty/stream/${sessionId}`);
}
