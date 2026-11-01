/**
 * Auth navigation contract shared by the Itech Angular applications.
 * A returnUrl is an untrusted input, including when received from a route guard.
 * This utility never accepts absolute/cross-origin/protocol-relative URLs.
 * To keep deployments independently buildable it is vendored identically; the
 * canonical contract should become an independently versioned package.
 */
export function safeReturnUrl(
  candidate: string | null | undefined,
  fallback: string,
  blockedPrefixes: readonly string[] = ['/login', '/connexion', '/auth/login', '/register', '/inscription'],
): string {
  if (!candidate || candidate.length > 2048 || !candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  if (/[\\\x00-\x1f\x7f]/.test(candidate) || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(candidate)) return fallback;
  let decoded: string;
  try { decoded = decodeURIComponent(candidate); } catch { return fallback; }
  if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(decoded)) return fallback;
  // Defend against double-encoded separators / traversal decoded by a later router layer.
  if (/%(?:2f|5c|2e)/i.test(decoded)) return fallback;
  const path = decoded.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  if (path.split('/').includes('..') || path.split('/').includes('.')) return fallback;
  if (blockedPrefixes.some(prefix => path.toLowerCase() === prefix.toLowerCase() || path.toLowerCase().startsWith(prefix.toLowerCase() + '/'))) return fallback;
  return candidate;
}
