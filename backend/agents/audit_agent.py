import re
import anthropic
from utils.json_utils import parse_llm_json

AUDIT_PROMPT = """You are a trusted, private pedagogical coach reviewing this lecture for the faculty member who recorded it.
Your role: give honest, specific, actionable feedback — like a respected colleague who watched the whole thing.
Tone: collegial and encouraging. Never punishing. Always specific.

Analyze across four dimensions:

1. PEDAGOGICAL — Are learning objectives stated clearly? Do concepts build on each other logically?
   Are abstract ideas grounded with concrete examples? Are there recaps at key moments?

2. ACCESSIBILITY — Is jargon introduced before it is explained? Are there moments where the
   lecturer says ONLY "as you can see here" or "look at this" with no verbal content at all —
   leaving audio-only listeners with nothing? Is the speaking pace reasonable for non-native speakers?
   IMPORTANT: Do NOT flag moments where the lecturer already uses descriptive language alongside
   visuals (e.g. "green pixels indicate positive weights"). That is good practice. Only flag moments
   where the verbal track carries zero information without the visual.

3. EQUITY — Is language inclusive (avoiding gendered defaults, cultural assumptions)?
   Are examples drawn from diverse contexts, or do they implicitly favor one group?
   Does the lecture assume prior knowledge that not all students would have?

4. CLARITY — Are sentences concise? Are transitions between topics explicit and smooth?
   Are key terms defined when first introduced?

Rules for your report:
- Start with genuine strengths — find at least 3 specific things that genuinely work well
- Cap total issues at 6 — be ruthless about priority, don't overwhelm
- For every issue: cite the timestamp, quote the exact problematic text, give a specific rewrite
- Accessibility suggestions must be ADDITIVE — always "add this sentence after" not "replace with".
  Never suggest removing visual language that works for viewers. Serve both audiences, not one at
  the expense of the other.
- The top_priority is the single highest-impact change — the one thing worth fixing before publishing
- Engagement: identify the section with the most momentum and the one that loses it
- First impression: the first 3 minutes determine whether students keep watching — be specific

CRITICAL QUOTING RULES — this is the most important part:
- Every original_text field MUST be copied CHARACTER FOR CHARACTER from the transcript lines above.
- Do NOT paraphrase, clean up, or reconstruct. Copy the raw words exactly as they appear.
- The timestamp for each issue is the [MM:SS] value on the line where those words appear.
- If a quote spans multiple lines, use the timestamp of the FIRST line.
- If you cannot find an exact match in the transcript, do not invent a quote — skip that issue.

Convert all timestamps from [MM:SS] format to seconds (e.g. [04:30] = 270.0).

Return JSON in exactly this format:
{
  "overall": {
    "pedagogical": "strong",
    "accessibility": "good",
    "equity": "strong",
    "clarity": "needs_work"
  },
  "summary": "2-3 sentence honest overall narrative. Encouraging but truthful. End with the single most important thing to work on.",
  "strengths": [
    "Specific strength with timestamp or example — not generic praise",
    "Another specific strength",
    "A third specific strength"
  ],
  "top_priority": {
    "category": "clarity",
    "timestamp": 245.0,
    "issue": "What the problem is and why it matters for students",
    "original_text": "The exact words from the transcript",
    "suggestion": "A concrete rewrite or action — specific enough to act on immediately"
  },
  "issues": [
    {
      "priority": 1,
      "category": "pedagogical",
      "timestamp": 123.0,
      "issue": "What the problem is and why it matters",
      "original_text": "Exact quote from transcript",
      "suggestion": "Specific rewrite or concrete fix"
    }
  ],
  "engagement": {
    "strongest_section": {
      "timestamp": 180.0,
      "reason": "Why this section works — what technique is driving the engagement"
    },
    "weakest_section": {
      "timestamp": 540.0,
      "reason": "Why momentum drops here and one concrete way to fix it"
    }
  },
  "first_impression": {
    "rating": "good",
    "feedback": "Specific feedback on the first 3 minutes — what lands, what could hook students faster"
  },
  "filler_phrases": {
    "count": 12,
    "examples": [
      {"phrase": "sort of", "timestamp": 45.0},
      {"phrase": "you know", "timestamp": 78.0}
    ],
    "note": "One sentence of coaching on this — keep it encouraging"
  }
}"""


def count_filler_phrases(transcript_text: str) -> int:
    """Count hedging/filler phrases directly from transcript without an LLM call."""
    fillers = [
        "sort of", "kind of", "you know", "basically", "essentially",
        "like,", "right?", "okay so", "um,", "uh,", "erm",
    ]
    text_lower = transcript_text.lower()
    total = 0
    for f in fillers:
        total += text_lower.count(f)
    return total


def _parse_transcript_segments(transcript_text: str) -> list[tuple[float, str]]:
    """
    Parse the formatted transcript into (timestamp_seconds, text) pairs.
    Each line looks like: [MM:SS] some text here
    """
    segments = []
    for line in transcript_text.split('\n'):
        m = re.match(r'\[(\d+):(\d+)\]\s+(.*)', line)
        if m:
            ts = int(m.group(1)) * 60 + int(m.group(2))
            segments.append((float(ts), m.group(3)))
    return segments


def _find_best_timestamp(quote: str, segments: list[tuple[float, str]]) -> float | None:
    """
    Search the transcript for the segment whose text best matches the quote.
    Uses a sliding window of 3 lines and word-overlap scoring.
    Returns the corrected timestamp, or None if no good match found.
    """
    if not quote or not segments:
        return None

    quote_words = set(re.sub(r'[^\w\s]', '', quote.lower()).split())
    if not quote_words:
        return None

    best_score = 0.45  # minimum word-overlap ratio to accept a match
    best_ts = None

    for i, (ts, _) in enumerate(segments):
        # Build a window of up to 3 consecutive lines
        window_text = ' '.join(
            re.sub(r'[^\w\s]', '', seg[1].lower())
            for seg in segments[i:i + 3]
        )
        window_words = set(window_text.split())

        if not window_words:
            continue

        overlap = len(quote_words & window_words) / len(quote_words)
        if overlap > best_score:
            best_score = overlap
            best_ts = ts

    return best_ts


def _verify_timestamps(report: dict, segments: list[tuple[float, str]]) -> dict:
    """
    After Claude returns the report, cross-check every quoted original_text
    against the actual transcript. Correct the timestamp if a better match is found.
    This catches hallucinated or paraphrased quotes with wrong timestamps.
    """
    def fix(item: dict) -> None:
        quote = item.get("original_text", "")
        if not quote:
            return
        corrected = _find_best_timestamp(quote, segments)
        if corrected is not None:
            item["timestamp"] = corrected

    fix(report.get("top_priority", {}))

    for issue in report.get("issues", []):
        fix(issue)

    return report


class AuditAgent:
    """
    Audits a lecture for pedagogical quality, accessibility, equity, and clarity.
    Returns a private, structured report for the faculty member only.
    """

    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def run(self, transcript_text: str, video_title: str) -> dict:
        response = await self.client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=6000,
            system=(
                "You are a trusted, private pedagogical coach. "
                "Return ONLY valid JSON — no markdown, no commentary, no code fences."
            ),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"Lecture Title: {video_title}\n\nTranscript:\n{transcript_text}",
                            "cache_control": {"type": "ephemeral"},
                        },
                        {"type": "text", "text": AUDIT_PROMPT},
                    ],
                }
            ],
        )
        report = parse_llm_json(response.content[0].text)

        # Normalize ratings — Claude sometimes returns unexpected values
        VALID_RATINGS = {"strong", "good", "needs_work"}
        VALID_CATEGORIES = {"pedagogical", "accessibility", "equity", "clarity"}

        def normalize_rating(r: str) -> str:
            r = str(r).lower().replace(" ", "_").replace("-", "_")
            if r in VALID_RATINGS:
                return r
            if r in {"excellent", "very_good", "great"}:
                return "strong"
            if r in {"fair", "moderate", "average", "okay", "ok"}:
                return "good"
            return "needs_work"

        def normalize_category(c: str) -> str:
            c = str(c).lower()
            return c if c in VALID_CATEGORIES else "clarity"

        overall = report.get("overall", {})
        for key in list(overall.keys()):
            overall[key] = normalize_rating(overall[key])

        tp = report.get("top_priority", {})
        if "category" in tp:
            tp["category"] = normalize_category(tp["category"])

        for issue in report.get("issues", []):
            if "category" in issue:
                issue["category"] = normalize_category(issue["category"])

        # Post-process: verify and correct timestamps for all quoted text
        segments = _parse_transcript_segments(transcript_text)
        report = _verify_timestamps(report, segments)

        # Enrich filler count with our own fast counter as a cross-check
        raw_count = count_filler_phrases(transcript_text)
        if "filler_phrases" in report:
            report["filler_phrases"]["count"] = max(
                report["filler_phrases"].get("count", 0), raw_count
            )

        return report
