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

    async def run(
        self,
        youtube_url: str,
        metadata: dict | None = None,
        transcript: list | None = None,
        transcript_text: str | None = None,
    ) -> dict:
        video_id = extract_video_id(youtube_url)

        if transcript is not None and transcript_text is not None and metadata is not None:
            # All data pre-fetched and validated by /api/process — skip redundant calls
            pass
        elif metadata is None:
            metadata, transcript = await asyncio.gather(
                get_video_metadata(video_id),
                get_transcript(video_id),
            )
            validate_duration(transcript)
            transcript_text = validate_content(transcript)
        else:
            transcript = await get_transcript(video_id)
            validate_duration(transcript)
            transcript_text = validate_content(transcript)

        last = transcript[-1]
        duration = last["start"] + last.get("duration", 0)
        metadata["duration"] = duration

        return {
            "metadata": metadata,
            "transcript": transcript,
            "transcript_text": transcript_text,
        }
