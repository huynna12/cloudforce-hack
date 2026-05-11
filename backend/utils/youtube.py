import re
import asyncio
import httpx
from youtube_transcript_api import YouTubeTranscriptApi


def extract_video_id(url: str) -> str:
    patterns = [
        r'(?:v=)([0-9A-Za-z_-]{11})',
        r'youtu\.be\/([0-9A-Za-z_-]{11})',
        r'embed\/([0-9A-Za-z_-]{11})',
        r'^([0-9A-Za-z_-]{11})$',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError("Could not extract video ID. Please paste a valid YouTube URL.")


async def get_video_metadata(video_id: str) -> dict:
    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(oembed_url)
        if response.status_code != 200:
            raise ValueError("Video not found or not publicly accessible.")
        data = response.json()
    return {
        "video_id": video_id,
        "title": data.get("title", "Untitled Lecture"),
        "author": data.get("author_name", "Unknown"),
        "thumbnail_url": data.get("thumbnail_url", f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"),
    }


async def get_transcript(video_id: str) -> list[dict]:
    loop = asyncio.get_event_loop()

    def _fetch():
        api = YouTubeTranscriptApi()
        try:
            # Try English first (manual or auto)
            snippets = api.fetch(video_id, languages=["en", "en-US", "en-GB"])
        except Exception:
            try:
                # Fall back to whichever language is available
                available = [t.language_code for t in api.list(video_id)]
                if not available:
                    raise ValueError("No transcript found for this video.")
                snippets = api.fetch(video_id, languages=available)
            except ValueError:
                raise
            except Exception as e:
                raise ValueError(f"Failed to fetch transcript: {str(e)}")

        # v1 returns FetchedTranscriptSnippet objects — convert to plain dicts
        return [{"text": s.text, "start": s.start, "duration": s.duration} for s in snippets]

    return await loop.run_in_executor(None, _fetch)


def format_transcript_for_llm(transcript: list[dict]) -> str:
    lines = []
    for seg in transcript:
        minutes = int(seg['start'] // 60)
        seconds = int(seg['start'] % 60)
        lines.append(f"[{minutes:02d}:{seconds:02d}] {seg['text']}")
    return "\n".join(lines)


def seconds_to_display(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"
