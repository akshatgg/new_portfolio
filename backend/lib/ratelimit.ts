/**
 * Per-IP fixed-window limiter.
 *
 * Deliberately in-memory: state lives in one serverless instance, so a visitor
 * spread across instances gets a higher effective limit than configured. That
 * is fine for its actual job — stopping one script from hammering the endpoint
 * in a loop — and it costs nothing and adds no dependency.
 *
 * If this ever needs to be exact (a real abuse problem, or a paid-tier key
 * worth draining), swap the Map for Upstash Redis; the function signature is
 * designed not to change.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Bound memory on a long-lived instance: drop expired buckets when the map
// grows past a threshold, rather than on a timer.
const MAX_TRACKED = 10_000;

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_TRACKED) sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Best available client identifier behind Vercel's proxy. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}
