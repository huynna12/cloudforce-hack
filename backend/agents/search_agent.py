import re
import anthropic
from utils.json_utils import parse_llm_json

SYSTEM_PROMPT = """You are a precise semantic search engine for lecture transcripts.
Given a student's question, find the most relevant moments in the transcript.
Return ONLY valid JSON — no markdown, no commentary, no code fences."""

SEARCH_TEMPLATE = """Find the 3 to 5 most relevant moments in this lecture for the following student question:

Question: {query}

Instructions:
- Rank results by relevance, most relevant first
- Extract the exact or closely paraphrased text from the transcript
- Convert [MM:SS] timestamps to total seconds for each result
- Write a concise explanation of why each result answers the question

Return JSON in exactly this format:
{{
  "results": [
    {{
      "timestamp": 123.0,
      "text": "The relevant passage from the transcript",
      "relevance": "One sentence explaining why this directly answers the question"
    }}
  ]
}}"""


def _parse_transcript_segments(transcript_text: str) -> list[tuple[float, str]]:
    """Parse [MM:SS] lines into (seconds, text) pairs."""
    segments = []
    for line in transcript_text.split("\n"):
        m = re.match(r"\[(\d+):(\d+)\]\s+(.*)", line)
        if m:
            ts = int(m.group(1)) * 60 + int(m.group(2))
            segments.append((float(ts), m.group(3)))
    return segments


def _correct_timestamp(text: str, segments: list[tuple[float, str]]) -> float | None:
    """
    Find the transcript segment whose text best matches the returned passage.
    Uses word-overlap scoring over a sliding window of 3 lines.
    Returns the corrected timestamp, or None if no confident match found.
    """
    if not text or not segments:
        return None

    query_words = set(re.sub(r"[^\w\s]", "", text.lower()).split())
    if not query_words:
        return None

    best_score = 0.35  # minimum overlap ratio to accept
    best_ts = None

    for i, (ts, _) in enumerate(segments):
        window_text = " ".join(
            re.sub(r"[^\w\s]", "", seg[1].lower())
            for seg in segments[i: i + 3]
        )
        window_words = set(window_text.split())
        if not window_words:
            continue

        overlap = len(query_words & window_words) / len(query_words)
        if overlap > best_score:
            best_score = overlap
            best_ts = ts

    return best_ts


class SearchAgent:
    """Handles semantic search over lecture transcripts using Claude Haiku."""

    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def search(self, transcript_text: str, video_title: str, query: str) -> list:
        response = await self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"Lecture Title: {video_title}\n\nTranscript:\n{transcript_text}",
                            "cache_control": {"type": "ephemeral"},
                        },
                        {
                            "type": "text",
                            "text": SEARCH_TEMPLATE.format(query=query),
                        },
                    ],
                }
            ],
        )

        data = parse_llm_json(response.content[0].text)
        results = data.get("results", [])

        # Verify and correct timestamps by matching returned text against the real transcript
        segments = _parse_transcript_segments(transcript_text)
        for result in results:
            corrected = _correct_timestamp(result.get("text", ""), segments)
            if corrected is not None:
                result["timestamp"] = corrected

        return results
