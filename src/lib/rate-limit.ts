/**
 * Simple in-memory rate limiter for server functions.
 * ponytail: per-invocation only — resets on cold start (Vercel serverless).
 * Sufficient for admin endpoints with auth. For public endpoints needing
 * persistent limits, use Upstash Redis or similar.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit. Returns true if allowed, false if rate-limited.
 * @param key Unique identifier (e.g., IP + endpoint)
 * @param maxRequests Max requests in window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000,
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;

  entry.count++;
  return true;
}


