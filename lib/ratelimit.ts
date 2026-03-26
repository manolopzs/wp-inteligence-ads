// Simple in-memory rate limiter — resets on server restart, good enough for beta.
// For multi-instance production, swap this for an Upstash/Redis-backed solution.

type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

/**
 * Returns true if the request is within the allowed rate.
 * @param key    Unique key (e.g. IP address + route)
 * @param max    Max requests allowed in the window
 * @param window Window duration in milliseconds
 */
export function rateLimit(key: string, max = 5, window = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + window })
    return true
  }

  if (entry.count >= max) return false
  entry.count++
  return true
}
