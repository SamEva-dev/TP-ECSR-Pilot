/** Extracts the application error key from HttpErrorResponse and known API envelopes.
 * API problems may be nested by HTTP interceptors or expose validation errors.
 * Never render an untrusted server message directly to the user. */
export function apiErrorCode(error: unknown): string {
  const seen = new Set<object>();
  const visit = (value: unknown, depth: number): string => {
    if (depth > 5 || value == null) return "";
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (/^[A-Z][A-Z0-9_]{3,}$/.test(trimmed)) return trimmed;
      // Angular may receive problem+json as text from some proxy responses.
      if (trimmed.startsWith("{") && trimmed.length < 10000) {
        try { return visit(JSON.parse(trimmed) as unknown, depth + 1); } catch { return ""; }
      }
      return "";
    }
    if (Array.isArray(value)) {
      for (const entry of value) { const result = visit(entry, depth + 1); if (result) return result; }
      return "";
    }
    if (typeof value !== "object" || seen.has(value)) return "";
    seen.add(value);
    const obj = value as Record<string, unknown>;
    for (const key of ["code", "errorCode", "errorKey"]) {
      const candidate = obj[key];
      if (typeof candidate === "string" && /^[A-Z][A-Z0-9_]{3,}$/.test(candidate.trim()))
        return candidate.trim();
    }
    for (const key of ["error", "problem", "response", "extensions", "errors"]) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) {
        for (const item of candidate) { const result = visit(item, depth + 1); if (result) return result; }
      } else if (candidate && typeof candidate === "object" && key === "errors") {
        for (const item of Object.values(candidate)) {
          const result = visit(item, depth + 1); if (result) return result;
        }
      } else {
        const result = visit(candidate, depth + 1);
        if (result) return result;
      }
    }
    return "";
  };
  return visit(error, 0);
}
