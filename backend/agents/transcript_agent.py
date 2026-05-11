import asyncio
from utils.youtube import (
    extract_video_id,
    get_video_metadata,
    get_transcript,
    validate_duration,
    validate_content,
)


class TranscriptAgent:
    """Fetches YouTube transcript and metadata. No LLM — pure data extraction."""

    async def run(self, youtube_url: str, metadata: dict | None = None) -> dict:
        video_id = extract_video_id(youtube_url)

        if metadata is None:
            metadata, transcript = await asyncio.gather(
                get_video_metadata(video_id),
                get_transcript(video_id),
            )
        else:
            transcript = await get_transcript(video_id)

        # Reject clips, Shorts, and anything too short to be a lecture
        validate_duration(transcript)
        # Reject music videos and audio-only content with no real speech
        # Returns the formatted transcript text — reuse it to avoid a second format pass
        transcript_text = validate_content(transcript)

        last = transcript[-1]
        duration = last["start"] + last.get("duration", 0)
        metadata["duration"] = duration

        return {
            "metadata": metadata,
            "transcript": transcript,
            "transcript_text": transcript_text,
        }
