/** Treat API null, absent, or malformed collections as empty. Reject null entries. */
export function apiCollection<T = any>(value: unknown): T[] {
  return Array.isArray(value)
    ? value.filter((item): item is T => item !== null && item !== undefined && typeof item === "object" && !Array.isArray(item))
    : [];
}
