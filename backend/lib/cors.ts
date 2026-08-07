/**
 * The Svelte frontend is a different origin from this API, so every response
 * needs CORS headers. Origins are allowlisted via ALLOWED_ORIGINS — a wildcard
 * would let any site spend your Gemini quota.
 */

const configured = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Convenience only: with nothing configured, permit local dev servers so the
// project runs out of the box. In production ALLOWED_ORIGINS must be set.
const DEV_FALLBACK = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
];

const allowlist = configured.length > 0 ? configured : DEV_FALLBACK;

export function isAllowedOrigin(origin: string | null): boolean {
  // Same-origin and server-to-server calls send no Origin header at all.
  if (!origin) return true;
  return allowlist.includes(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    // Responses differ per origin, so caches must key on it.
    Vary: 'Origin',
  };

  if (origin && allowlist.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}
