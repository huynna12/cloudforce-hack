import asyncio
import json
import anthropic
from utils.json_utils import parse_llm_json

SUPPORTED_LANGUAGES = [
    "Spanish", "French", "German", "Portuguese", "Italian",
    "Chinese (Simplified)", "Japanese", "Korean", "Arabic", "Hindi",
    "Vietnamese",
]


class TranslationAgent:
    """Translates study materials on demand using Claude Haiku."""

    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def translate(self, content: any, language: str, content_type: str) -> any:
        if language not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported language: {language}. Supported: {', '.join(SUPPORTED_LANGUAGES)}")

        # Summaries are long markdown strings — translate each depth separately
        # to avoid JSON corruption from special characters (##, **, newlines etc.)
        if content_type == "summaries":
            return await self._translate_summaries(content, language)

        return await self._translate_json(content, language, content_type)

    async def _translate_summaries(self, summaries: dict, language: str) -> dict:
        """Translate brief/medium/full as plain text in parallel, then reassemble."""
        brief, medium, full = await asyncio.gather(
            self._translate_plain_text(summaries.get("brief", ""), language),
            self._translate_plain_text(summaries.get("medium", ""), language),
            self._translate_plain_text(summaries.get("full", ""), language),
        )
        return {"brief": brief, "medium": medium, "full": full}

    async def _translate_plain_text(self, text: str, language: str) -> str:
        """Translate a single markdown string, preserving all formatting."""
        if not text:
            return text
        response = await self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4000,
            messages=[
                {
                    "role": "user",
                    "content": f"""Translate the following markdown text to {language}.

Rules:
- Preserve ALL markdown formatting exactly (##, **bold**, - bullets, blank lines)
- Only translate the words — do not change any markdown symbols
- Return ONLY the translated markdown, no explanation

Text:
{text}""",
                }
            ],
        )
        return response.content[0].text.strip()

    async def _translate_json(self, content: any, language: str, content_type: str) -> any:
        """Translate structured JSON content (outline, flashcards, key_terms)."""
        content_json = json.dumps(content, ensure_ascii=False)

        response = await self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=8000,
            messages=[
                {
                    "role": "user",
                    "content": f"""Translate the following {content_type} study material to {language}.

Rules:
- Keep ALL JSON field names in English (e.g., "heading", "front", "back", "term")
- Keep ALL numeric values unchanged (timestamps stay as numbers)
- Only translate the human-readable text values
- Preserve the exact JSON structure
- Return ONLY the translated JSON, nothing else

Content:
{content_json}""",
                }
            ],
        )

        return parse_llm_json(response.content[0].text)
