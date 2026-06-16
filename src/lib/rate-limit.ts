// Simple in-memory rate limiter (per-process, resets on cold start)
// Adequate for serverless with low traffic; swap for Redis/Upstash if needed

const store = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count }
}
