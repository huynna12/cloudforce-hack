import asyncio
from utils.youtube import (
    extract_video_id,
    get_video_metadata,
    get_transcript,
    validate_duration,
    format_transcript_for_llm,
)


class TranscriptAgent:
    """Fetches YouTube transcript and metadata. No LLM — pure data extraction."""

    async def run(self, youtube_url: str) -> dict:
        video_id = extract_video_id(youtube_url)

        metadata, transcript = await asyncio.gather(
            get_video_metadata(video_id),
            get_transcript(video_id),
        )

        # Reject clips, Shorts, and anything too short to be a lecture
        validate_duration(transcript)

        last = transcript[-1]
        duration = last["start"] + last.get("duration", 0)
        metadata["duration"] = duration

        transcript_text = format_transcript_for_llm(transcript)

        return {
            "metadata": metadata,
            "transcript": transcript,
            "transcript_text": transcript_text,
        }
