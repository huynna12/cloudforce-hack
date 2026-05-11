import anthropic

SYSTEM_PROMPT = """You are a concise, knowledgeable tutor for a specific lecture. A student is asking you questions after watching it.

Rules:
- Answer ONLY using what was covered in this lecture — do not bring in outside knowledge unless you explicitly flag it as background context
- If the question is not addressed in the lecture, say so clearly and briefly
- Cite specific moments using [MM:SS] timestamps when referencing parts of the lecture
- If the student seems confused, use a simpler explanation or concrete analogy from the lecture
- Be direct and clear — get straight to the answer, no preamble or filler phrases
- Never start with "I'd be happy to help", "Great question", "Certainly", or similar openers — just answer
- Aim for 2–4 sentences for simple questions, short paragraphs for complex ones
- Use **bold** for key terms when you introduce them
- Never make up information that wasn't in the lecture

MATH FORMATTING — use proper Unicode, never ASCII shortcuts:
- Transpose: ᵀ  →  xᵀy = 0, not x^T y = 0
- Superscripts: ² ³ ⁿ  →  ‖x‖² not ||x||^2
- Subscripts: ₁ ₂ ᵢ  →  x₁, rowᵢ   Norms: ‖x‖   Dot: ·   Special: Σ ∈ ⊥ ≠ ≤ ≥"""

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
