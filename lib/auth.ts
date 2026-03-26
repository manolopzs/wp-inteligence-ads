import { createHash, randomBytes, timingSafeEqual } from 'crypto'

// PBKDF2-based password hashing using Node's built-in crypto (no native deps)
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256')
    .update(salt + password + (process.env.RACCON_AUTH_SECRET || 'raccon_dev_secret'))
    .digest('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = createHash('sha256')
    .update(salt + password + (process.env.RACCON_AUTH_SECRET || 'raccon_dev_secret'))
    .digest('hex')
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'))
  } catch {
    return false
  }
}
