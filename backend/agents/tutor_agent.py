import anthropic

SYSTEM_PROMPT = """You are a patient, knowledgeable tutor for a specific lecture. A student is coming to you with questions after watching it.

Rules:
- Answer ONLY using what was covered in this lecture — do not bring in outside knowledge unless you explicitly flag it as background context
- If the question is not addressed in the lecture, say so clearly and honestly
- Cite specific moments using [MM:SS] timestamps when referencing parts of the lecture
- If the student seems confused, try a simpler explanation or a concrete analogy
- Be conversational, warm, and encouraging — you are a tutor, not a search engine
- Aim for 2–5 sentences for simple questions, more for complex ones
- Never make up information that wasn't in the lecture"""

QUESTION_TEMPLATE = """The student asks: {question}

Answer grounded in this lecture only. Include [MM:SS] timestamp citations where relevant."""


class TutorAgent:
    """Answers student questions grounded in the lecture transcript using Claude Sonnet."""

    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def answer(
        self,
        transcript_text: str,
        video_title: str,
        question: str,
        history: list[dict],  # [{question, answer}, ...]
    ) -> str:
        # Build conversation history so Claude handles follow-ups naturally
        messages = []

        # Previous turns
        for turn in history[-6:]:  # keep last 6 turns to stay within context
            messages.append({
                "role": "user",
                "content": QUESTION_TEMPLATE.format(question=turn["question"]),
            })
            messages.append({
                "role": "assistant",
                "content": turn["answer"],
            })

        # Current question
        messages.append({
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f"Lecture Title: {video_title}\n\nTranscript:\n{transcript_text}",
                    "cache_control": {"type": "ephemeral"},
                },
                {
                    "type": "text",
                    "text": QUESTION_TEMPLATE.format(question=question),
                },
            ],
        })

        response = await self.client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=messages,
        )

        return response.content[0].text
