import anthropic
from utils.json_utils import parse_llm_json

SYSTEM_PROMPT = """You are an expert educational content analyzer specializing in lecture structure.
You create clear, hierarchical outlines that help students navigate lecture content efficiently.
Always use precise timestamps so students can jump directly to any point in the video.
Return ONLY valid JSON — no markdown, no commentary, no code fences."""

OUTLINE_PROMPT = """Create a comprehensive structured outline of this lecture.

Requirements:
- 6 to 12 major sections
- Each section has a descriptive heading, a timestamp (in seconds), a 1–2 sentence summary, and 2–4 sub-points with their own timestamps
- Timestamps must be accurate — convert [MM:SS] in the transcript to total seconds (e.g., [02:30] = 150.0)

Return JSON in exactly this format:
{
  "outline": [
    {
      "heading": "Section Title",
      "timestamp": 0.0,
      "summary": "What this section covers in 1–2 sentences.",
      "sub_points": [
        {"text": "A key concept or point discussed here", "timestamp": 45.0}
      ]
    }
  ]
}"""


class OutlineAgent:
    """Generates structured lecture outline with timestamps using Claude Sonnet."""

    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def run(self, transcript_text: str, video_title: str) -> list:
        response = await self.client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=3000,
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
                            "text": OUTLINE_PROMPT,
                        },
                    ],
                }
            ],
        )

        data = parse_llm_json(response.content[0].text)
        return data.get("outline", [])
