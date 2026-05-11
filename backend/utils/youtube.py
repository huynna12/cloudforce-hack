import re
import asyncio
import httpx
from youtube_transcript_api import YouTubeTranscriptApi

# Minimum lecture length — anything shorter isn't worth processing
MIN_DURATION_SECONDS = 120  # 2 minutes


def extract_video_id(url: str) -> str:
    url = url.strip()

    # Reject YouTube Shorts upfront
    if "/shorts/" in url:
        raise ValueError("YouTube Shorts aren't supported — please paste a full lecture video URL.")

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

    if "youtube.com" in url or "youtu.be" in url:
        raise ValueError("Couldn't find a video ID in that YouTube URL. Make sure it's a standard watch link (youtube.com/watch?v=...).")

    raise ValueError("That doesn't look like a YouTube URL. Please paste a link from youtube.com or youtu.be.")


async def get_video_metadata(video_id: str) -> dict:
    oembed_url = (
        f"https://www.youtube.com/oembed"
        f"?url=https://www.youtube.com/watch?v={video_id}&format=json"
    )
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(oembed_url)

    if response.status_code == 401:
        raise ValueError("This video is age-restricted or private. Please use a publicly accessible lecture video.")
    if response.status_code == 403:
        raise ValueError("This video is private. Please use a publicly accessible lecture video.")
    if response.status_code == 404:
        raise ValueError("Video not found. Please check the URL and make sure the video is public.")
    if response.status_code != 200:
        raise ValueError(f"Couldn't access this video (status {response.status_code}). Make sure it's a public YouTube video.")

    data = response.json()

    # oEmbed returns type "video" for normal videos and may differ for live
    # The title often contains "LIVE" for active streams — catch obvious cases
    title = data.get("title", "")
    if any(kw in title.upper() for kw in ["#LIVE", "LIVE STREAM", "LIVESTREAM"]):
        raise ValueError("This appears to be a livestream. Please use a recorded lecture video instead.")

    return {
        "video_id": video_id,
        "title": title or "Untitled Lecture",
        "author": data.get("author_name", "Unknown"),
        "thumbnail_url": data.get(
            "thumbnail_url",
            f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
        ),
    }


async def get_transcript(video_id: str) -> list[dict]:
    loop = asyncio.get_event_loop()

    def _fetch():
        api = YouTubeTranscriptApi()

        # Step 1 — discover what captions actually exist
        try:
            transcript_list = list(api.list(video_id))
        except Exception as e:
            err = str(e).lower()
            if "live" in err or "streaming" in err:
                raise ValueError("This video is a live stream and doesn't have a transcript yet. Try again after it's been processed by YouTube.")
            if "too many requests" in err or "429" in err:
                raise ValueError("YouTube is rate-limiting requests right now. Please wait a moment and try again.")
            raise ValueError("No captions found for this video. Please use a lecture with captions enabled.")

        if not transcript_list:
            raise ValueError("No captions found for this video. Please use a lecture with captions enabled.")

        # Step 2 — pick the best available transcript
        # Priority: manual English > auto English > manual any language > auto any language
        def preference(t) -> tuple:
            is_english = t.language_code.lower().startswith("en")
            is_manual  = not t.is_generated
            return (0 if is_english else 1, 0 if is_manual else 1)

        transcript_list.sort(key=preference)
        best = transcript_list[0]

        # Step 3 — fetch it
        try:
            snippets = best.fetch()
        except Exception as e:
            err = str(e).lower()
            if "too many requests" in err or "429" in err:
                raise ValueError("YouTube is rate-limiting requests right now. Please wait a moment and try again.")
            raise ValueError("Couldn't fetch captions for this video. Please make sure the video is public and has captions enabled.")

        return [
            {"text": s.text, "start": s.start, "duration": s.duration}
            for s in snippets
        ]

    return await loop.run_in_executor(None, _fetch)


def validate_duration(transcript: list[dict]) -> None:
    """Reject videos that are too short to be a lecture."""
    if not transcript:
        raise ValueError("This video has no usable transcript content.")

    last = transcript[-1]
    duration = last["start"] + last.get("duration", 0)

    if duration < MIN_DURATION_SECONDS:
        minutes = int(duration // 60)
        seconds = int(duration % 60)
        raise ValueError(
            f"This video is only {minutes}m {seconds}s long — Heidi works best with lecture videos "
            f"that are at least 2 minutes. Please try a full lecture."
        )


def validate_content(transcript: list[dict]) -> None:
    """
    Reject videos that are mostly music/noise rather than spoken content.
    Music videos typically have the vast majority of their transcript segments
    as [Music] markers with very few real words after stripping.
    """
    if not transcript:
        return

    noise = re.compile(r'\[[\w\s]+\]')
    total = len(transcript)
    noise_only = sum(
        1 for seg in transcript
        if not noise.sub("", seg["text"]).strip()
    )

    # If more than 60% of segments are pure noise, it's not a lecture
    if total > 0 and (noise_only / total) > 0.6:
        raise ValueError(
            "This video doesn't appear to have spoken content — it looks like a music video or "
            "audio-only content. Heidi works with lecture videos that have real speech."
        )

    # Secondary check: fewer than 80 words after stripping is not enough to work with
    formatted = format_transcript_for_llm(transcript)
    word_count = len(formatted.split())
    if word_count < 80:
        raise ValueError(
            "This video has very little spoken content. Heidi works best with lecture videos "
            "that have substantial speech — try a full university lecture."
        )


def format_transcript_for_llm(transcript: list[dict]) -> str:
    # Strip auto-generated noise markers like [Music], [Applause], [Laughter], etc.
    noise = re.compile(r'\[[\w\s]+\]')
    lines = []
    for seg in transcript:
        text = noise.sub("", seg['text']).strip()
        if not text:
            continue  # skip segments that were only noise
        minutes = int(seg['start'] // 60)
        seconds = int(seg['start'] % 60)
        lines.append(f"[{minutes:02d}:{seconds:02d}] {text}")
    return "\n".join(lines)


def seconds_to_display(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"
