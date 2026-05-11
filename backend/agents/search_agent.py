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
        return data.get("results", [])
