/**
 * Heuristic: does this error message describe a *temporary* condition (rate limit,
 * "we're busy", "wait and try again") where the user should retry the SAME video,
 * versus a permanent problem (bad link, no captions, private) where they should try
 * a different one? Drives whether we show a friendly "hang on a sec" banner or a
 * hard error.
 */
export function isTransientError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /rate.?limit|too many|wait|a moment|30 second|try again|temporarily|busy/i.test(message);
}
