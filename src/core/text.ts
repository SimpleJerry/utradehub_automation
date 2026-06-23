/**
 * Throwaway sample to validate the harness pipeline end-to-end
 * (typecheck + lint + test + coverage + golden fixture).
 * Replaced by the real domain core in change ②.
 */
export function normalizeWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}
