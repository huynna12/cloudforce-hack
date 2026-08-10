import anthropic as anthropic_lib


def friendly_error(exc: Exception) -> str:
    """Translate raw API / library exceptions into user-readable messages."""
    if isinstance(exc, anthropic_lib.RateLimitError):
        return "We're processing too many videos right now — please wait 30 seconds and try again."
    if isinstance(exc, anthropic_lib.APIConnectionError):
        return "Couldn't reach the AI service. Check your internet connection and try again."
    if isinstance(exc, anthropic_lib.APIStatusError):
        return "The AI service returned an error. Please try again in a moment."
    return str(exc)  # our own ValueError messages are already user-friendly
