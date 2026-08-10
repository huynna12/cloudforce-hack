import re
import time
import asyncio
import httpx
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
import os

# Minimum lecture length — anything shorter isn't worth processing
MIN_DURATION_SECONDS = 120  # 2 minutes

# Transcript fetch retry policy — YouTube rate-limits aggressively, especially from
# datacenter IPs, and the same video usually succeeds on a second try.
_MAX_TRANSCRIPT_ATTEMPTS = 3

# Error-string markers that mean "transient, worth retrying" rather than a genuine
# "this video has no captions" (which won't improve on retry).
_TRANSIENT_MARKERS = (
    "too many requests", "429", "rate limit", "rate-limit",
    "timeout", "timed out", "temporarily", "connection",
    "ip block", "ipblocked", "try again",
)

_RATE_LIMIT_MSG = (
    "YouTube is temporarily limiting requests. "
    "Please wait about 30 seconds and try the same video again."
)


def _is_transient(err: str) -> bool:
    e = err.lower()
    return any(m in e for m in _TRANSIENT_MARKERS)

# Title substrings that reliably indicate a music video (case-insensitive)
_MUSIC_TITLE_MARKERS = {
    "official music video", "official video", "official audio",
    "official lyric video", "lyric video", "lyrics video",
    "music video", "(mv)", " m/v", "m/v ", "(official)", "[official]",
    "official visualizer", "official performance", "audio only",
}


def _is_music_video(title: str, author: str) -> bool:
    """Heuristic check using metadata — fires before any transcript is fetched."""
    t = title.lower()
    a = author.lower()
    # VEVO channels exclusively publish music
    if "vevo" in a:
        return True
    # Common music video title patterns
    return any(marker in t for marker in _MUSIC_TITLE_MARKERS)


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


_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}


async def _get_video_category(video_id: str, client: httpx.AsyncClient) -> str | None:
    """Fetch the YouTube watch page and extract the video category (e.g. 'Music')."""
    try:
        resp = await client.get(
            f"https://www.youtube.com/watch?v={video_id}",
            headers=_BROWSER_HEADERS,
            timeout=8.0,
        )
        match = re.search(r'"category":"([^"]+)"', resp.text)
        return match.group(1) if match else None
    except Exception:
        return None  # don't block if page fetch fails


async def get_video_metadata(video_id: str) -> dict:
    oembed_url = (
        f"https://www.youtube.com/oembed"
        f"?url=https://www.youtube.com/watch?v={video_id}&format=json"
    )
    async with httpx.AsyncClient(timeout=10.0) as client:
        # The oembed endpoint gets rate-limited too — retry transient failures (network
        # errors, 429, 5xx) with a short backoff, mirroring the transcript fetch.
        oembed_resp = None
        category = None
        for attempt in range(_MAX_TRANSCRIPT_ATTEMPTS):
            try:
                oembed_resp, category = await asyncio.gather(
                    client.get(oembed_url),
                    _get_video_category(video_id, client),
                )
            except httpx.HTTPError:
                if attempt < _MAX_TRANSCRIPT_ATTEMPTS - 1:
                    await asyncio.sleep(1.0 * (attempt + 1))
                    continue
                raise ValueError(_RATE_LIMIT_MSG)
            if oembed_resp.status_code in (429, 500, 502, 503, 504) and attempt < _MAX_TRANSCRIPT_ATTEMPTS - 1:
                await asyncio.sleep(1.0 * (attempt + 1))
                continue
            break

    if oembed_resp.status_code == 401:
        raise ValueError("This video is age-restricted or private. Please use a publicly accessible lecture video.")
    if oembed_resp.status_code == 403:
        raise ValueError("This video is private. Please use a publicly accessible lecture video.")
    if oembed_resp.status_code == 404:
        raise ValueError("Video not found. Please check the URL and make sure the video is public.")
    if oembed_resp.status_code == 429 or oembed_resp.status_code >= 500:
        raise ValueError(_RATE_LIMIT_MSG)
    if oembed_resp.status_code != 200:
        raise ValueError(f"Couldn't access this video (status {oembed_resp.status_code}). Make sure it's a public YouTube video.")

    data   = oembed_resp.json()
    title  = data.get("title", "")
    author = data.get("author_name", "")

    # Reject active livestreams
    if any(kw in title.upper() for kw in ["#LIVE", "LIVE STREAM", "LIVESTREAM"]):
        raise ValueError("This appears to be a livestream. Please use a recorded lecture video instead.")

    # Reject by YouTube's own category — most reliable signal
    if category and category.lower() == "music":
        raise ValueError(
            "This looks like a music video. Heidi is designed for educational lectures — "
            "please paste a university lecture or tutorial video."
        )

    # Fallback: title/channel heuristic for cases where category fetch failed
    if _is_music_video(title, author):
        raise ValueError(
            "This looks like a music video. Heidi is designed for educational lectures — "
            "please paste a university lecture or tutorial video."
        )

    return {
        "video_id": video_id,
        "title": title or "Untitled Lecture",
        "author": author or "Unknown",
        "thumbnail_url": data.get(
            "thumbnail_url",
            f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
        ),
    }


async def get_transcript(video_id: str) -> list[dict]:
    loop = asyncio.get_event_loop()

    def _fetch():
        # Use the Webshare proxy when credentials are configured; fall back to a direct
        # connection otherwise (e.g. local dev). Reading via os.environ.get avoids a
        # KeyError — which isn't a ValueError, so it would otherwise escape the
        # /api/process handler as an opaque 500 instead of a friendly message.
        proxy_username = os.environ.get("WEBSHARE_PROXY_USERNAME")
        proxy_password = os.environ.get("WEBSHARE_PROXY_PASSWORD")
        if proxy_username and proxy_password:
            api = YouTubeTranscriptApi(
                proxy_config=WebshareProxyConfig(
                    proxy_username=proxy_username,
                    proxy_password=proxy_password,
                )
            )
        else:
            api = YouTubeTranscriptApi()

        # Priority: manual English > auto English > manual any language > auto any language
        def preference(t) -> tuple:
            is_english = t.language_code.lower().startswith("en")
            is_manual  = not t.is_generated
            return (0 if is_english else 1, 0 if is_manual else 1)

        # Retry transient failures (rate limits, IP blocks, network blips) with a short
        # backoff before giving up — a single blip shouldn't send the user away. Genuine
        # problems (no captions, disabled, livestream) raise immediately without retrying.
        for attempt in range(_MAX_TRANSCRIPT_ATTEMPTS):
            try:
                transcript_list = list(api.list(video_id))
                if not transcript_list:
                    raise ValueError("This video doesn't have captions. Please try a lecture that has captions enabled.")
                transcript_list.sort(key=preference)
                snippets = transcript_list[0].fetch()
                return [
                    {"text": s.text, "start": s.start, "duration": s.duration}
                    for s in snippets
                ]
            except ValueError:
                raise  # our own genuine, user-friendly messages — never retry these
            except Exception as e:
                err = str(e).lower()
                if "live" in err or "streaming" in err:
                    raise ValueError("This looks like a live stream, which doesn't have a transcript yet. Try a recorded lecture.")
                if _is_transient(err):
                    if attempt < _MAX_TRANSCRIPT_ATTEMPTS - 1:
                        time.sleep(1.0 * (attempt + 1))  # brief backoff: 1s, then 2s
                        continue
                    raise ValueError(_RATE_LIMIT_MSG)
                # Unknown, non-transient failure — most often genuinely no captions.
                raise ValueError("This video doesn't have captions. Please try a lecture that has captions enabled.")

        raise ValueError(_RATE_LIMIT_MSG)  # retries exhausted on transient errors

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


def validate_content(transcript: list[dict]) -> str:
    """
    Reject videos that are mostly music/noise rather than spoken content.
    Music videos typically have the vast majority of their transcript segments
    as [Music] markers with very few real words after stripping.

    Returns the formatted transcript text so callers can reuse it without
    calling format_transcript_for_llm a second time.
    """
    if not transcript:
        return ""

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

    return formatted


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
