import asyncio
import anthropic
from utils.json_utils import parse_llm_json

SYSTEM_PROMPT = """You are an expert educational content synthesizer.
You transform lecture transcripts into precise, study-ready materials.
Always cite timestamps so students can verify claims in the original video.
Return ONLY valid JSON — no markdown, no commentary, no code fences."""

FORMATTING_RULES = """Formatting rules:
- Use ## for major section headings
- Use **bold** for key terms, concepts, and important values when first introduced
- Use bullet points ( - ) for lists of items, steps, or examples
- Leave a blank line between sections for breathing room
- Keep sentences concise — one idea per sentence
- Do NOT include a "Next Steps", "What's Next", or "Coming Up" section — only cover what this lecture actually teaches

CRITICAL — MATH FORMATTING:
Never use triple-backtick fences (``` ```) or indented code blocks anywhere in the summary.
Never draw matrices, vectors, or diagrams using spaces and brackets.
All equations must be written inline using proper Unicode math characters — never use ^ for superscripts or ASCII shortcuts.

Unicode to use:
- Superscript T (transpose): ᵀ  →  write xᵀy = 0, not x^T y = 0
- Superscript numbers: ² ³ ⁿ  →  write ‖x‖² not ||x||^2
- Subscripts: ₁ ₂ ₃ ᵢ ₙ  →  write x₁, rowᵢ
- Dot product: ·  →  write rowᵢ · x = 0
- Norms: ‖x‖ (double vertical bar, not ||)
- Special: Σ ∈ ⊥ ≠ ≤ ≥ → ← ↔

Good: "Each row satisfies rowᵢ · x = 0, so Ax = 0 means x is orthogonal to every row of A."
Bad: "x^T y = 0" or "||x||^2" or wrapping math in ``` ``` blocks."""

BRIEF_PROMPT = f"""Write a very short summary of this lecture that a student can read in 90 seconds (~120 words MAX). Use rich markdown formatting.

{FORMATTING_RULES}

2-3 punchy sentences or a tight bulleted list. The absolute core idea only — what is this lecture about and why does it matter. No headings needed.

Return JSON in exactly this format:
{{
  "summary": "markdown string here"
}}"""

MEDIUM_PROMPT = f"""Write a 5-minute summary (~600 words) of this lecture. Use rich markdown formatting.

{FORMATTING_RULES}

Use ## section headings to organize the content. Bold key terms. Mix short paragraphs with bullet lists where appropriate.

Return JSON in exactly this format:
{{
  "summary": "markdown string here"
}}"""

FULL_PROMPT = f"""Write a comprehensive, detailed summary (~1200 words) of this lecture. Use rich markdown formatting.

{FORMATTING_RULES}

Full ## section breakdown covering every major concept, with bold terms, bullet lists, examples, and clear hierarchy. Suitable for deep review before an exam — leave nothing important out.

Return JSON in exactly this format:
{{
  "summary": "markdown string here"
}}"""

FLASHCARDS_PROMPT = """Create 12 to 20 high-quality flashcards from this lecture.

MATH FORMATTING — use proper Unicode, never ASCII shortcuts:
- Transpose: ᵀ  →  xᵀy = 0, not x^T y = 0
- Superscripts: ² ³ ⁿ  →  ‖x‖² not ||x||^2
- Subscripts: ₁ ₂ ᵢ  →  x₁, rowᵢ   Norms: ‖x‖   Dot: ·   Special: Σ ∈ ⊥


Focus on:
- Key definitions and terminology
- Important relationships, comparisons, and contrasts
- Processes, mechanisms, and sequences
- Facts, figures, and formulas worth memorizing

For each flashcard, include the timestamp (in seconds) of where the concept appears.
Convert [MM:SS] to seconds (e.g., [03:45] = 225.0).

Return JSON in exactly this format:
{
  "flashcards": [
    {
      "front": "Clear, specific question — not 'What is X?' but something that tests real understanding",
      "back": "Accurate, complete answer in 1–3 sentences",
      "timestamp": 123.0,
      "source_text": "Brief quote or close paraphrase from the lecture",
      "expression": "For formula/equation flashcards only: the mathematical notation using Unicode symbols (e.g. 'AᵀA = AᵀA' or 'T(n) = 2T(n/2) + Θ(n)'). Omit this field entirely for non-formula cards."
    }
  ]
}"""

KEY_TERMS_PROMPT = """Extract all key terms, concepts, and vocabulary introduced or defined in this lecture.

Only include terms that the lecturer explicitly defines, introduces, or explains — not general knowledge.
For each term include the timestamp (in seconds) of the moment it is first defined or introduced.
Convert [MM:SS] to seconds (e.g., [03:45] = 225.0).

MATH FORMATTING — use proper Unicode, never ASCII shortcuts:
- Transpose superscript: ᵀ  →  xᵀy = 0, not x^T y = 0
- Superscript numbers: ² ³ ⁿ  →  ‖x‖² not ||x||^2
- Subscripts: ₁ ₂ ᵢ ₙ  →  x₁, rowᵢ
- Norms: ‖x‖ not ||x||
- Dot product: ·   Special: Σ ∈ ⊥ ≠ ≤ ≥

Return JSON in exactly this format:
{
  "key_terms": [
    {
      "term": "The exact term or concept name",
      "definition": "The definition or explanation as given in this lecture — in the lecturer's own words or a close paraphrase",
      "timestamp": 123.0,
      "category": "One short category label, e.g. 'Algorithm', 'Concept', 'Formula', 'Framework', 'Person', 'Tool'",
      "expression": "For Formula terms only: the actual mathematical notation using Unicode symbols (e.g. 'xᵀy = 0' or 'AᵀA = AᵀA'). Omit this field for non-Formula terms."
    }
  ]
}

Aim for 8 to 20 terms depending on the lecture's density."""


class SynthesisAgent:
    """Generates summaries, flashcards, and key terms using Claude Sonnet with prompt caching."""

    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    # ~120k chars ≈ ~30k tokens — enough for a 2-hour lecture
    MAX_TRANSCRIPT_CHARS = 120_000

    async def run(self, transcript_text: str, video_title: str) -> dict:
        # Truncate very long transcripts to avoid runaway costs / slow responses
        if len(transcript_text) > self.MAX_TRANSCRIPT_CHARS:
            transcript_text = (
                transcript_text[: self.MAX_TRANSCRIPT_CHARS]
                + "\n\n[Transcript truncated for length — covers approximately the first 2 hours of the lecture]"
            )

        # Run all 5 calls in parallel — brief/medium/full are now separate so none can truncate the others
        brief, medium, full, flashcards, key_terms = await asyncio.gather(
            self._generate_one_summary(transcript_text, video_title, BRIEF_PROMPT, 1500),
            self._generate_one_summary(transcript_text, video_title, MEDIUM_PROMPT, 3000),
            self._generate_one_summary(transcript_text, video_title, FULL_PROMPT, 5000),
            self._generate_flashcards(transcript_text, video_title),
            self._generate_key_terms(transcript_text, video_title),
        )
        return {
            "summaries": {"brief": brief, "medium": medium, "full": full},
            "flashcards": flashcards,
            "key_terms": key_terms,
        }

    def _build_messages(self, transcript_text: str, video_title: str, task_prompt: str) -> list:
        return [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"Lecture Title: {video_title}\n\nTranscript:\n{transcript_text}",
                        "cache_control": {"type": "ephemeral"},
                    },
                    {"type": "text", "text": task_prompt},
                ],
            }
        ]

    def _build_system(self) -> list:
        return [{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}]

    async def _generate_one_summary(
        self, transcript_text: str, video_title: str, prompt: str, max_tokens: int
    ) -> str:
        response = await self.client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=max_tokens,
            system=self._build_system(),
            messages=self._build_messages(transcript_text, video_title, prompt),
        )
        data = parse_llm_json(response.content[0].text)
        return data.get("summary", "")

    async def _generate_flashcards(self, transcript_text: str, video_title: str) -> list:
        response = await self.client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=6000,
            system=self._build_system(),
            messages=self._build_messages(transcript_text, video_title, FLASHCARDS_PROMPT),
        )
        data = parse_llm_json(response.content[0].text)
        return data.get("flashcards", [])

    async def _generate_key_terms(self, transcript_text: str, video_title: str) -> list:
        response = await self.client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=3000,
            system=self._build_system(),
            messages=self._build_messages(transcript_text, video_title, KEY_TERMS_PROMPT),
        )
        data = parse_llm_json(response.content[0].text)
        return data.get("key_terms", [])
