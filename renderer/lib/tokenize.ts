/**
 * Returns a stable approximate token count suitable for UI telemetry.
 */
export function estimateTokenCount(input: string): number {
  const text = input.trim();
  if (!text) {
    return 0;
  }

  const words = text.split(/\s+/).length;
  const punctuation = (text.match(/[.,!?;:()[\]{}"'`]/g) ?? []).length;
  return Math.max(1, Math.round(words + punctuation * 0.25));
}

/**
 * Formats duration in milliseconds for compact chat telemetry.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms} ms`;
  }

  return `${(ms / 1000).toFixed(2)} s`;
}
