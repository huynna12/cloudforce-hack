import json
import re


def parse_llm_json(text: str) -> any:
    """
    Parse JSON from an LLM response that may be wrapped in markdown code fences.
    Tries progressively looser strategies before giving up.
    """
    text = text.strip()
    if not text:
        raise ValueError("Empty response from model")

    # Strategy 1: direct parse (model obeyed instructions)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strategy 2: strip ```json ... ``` or ``` ... ``` fences (with or without closing fence)
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fenced:
        try:
            return json.loads(fenced.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Strategy 2b: opening fence but no closing fence (truncated response)
    fenced_open = re.search(r"```(?:json)?\s*([\s\S]*)", text)
    if fenced_open:
        try:
            return json.loads(fenced_open.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Strategy 3: find the first { or [ and parse from there
    for start_char, end_char in [('{', '}'), ('[', ']')]:
        start = text.find(start_char)
        end = text.rfind(end_char)
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass

    raise ValueError(f"Could not parse JSON from model response: {text[:200]}")
