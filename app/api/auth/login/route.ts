import { NextRequest, NextResponse } from 'next/server'
import { getUsersTable } from '@/lib/airtable'
import { verifyPassword } from '@/lib/auth'
import { rateLimit } from '@/lib/ratelimit'

function setAuthCookies(res: NextResponse, secret: string, isAdmin: boolean) {
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  }
  res.cookies.set('raccon_auth', secret, cookieOpts)
  if (isAdmin) {
    res.cookies.set('raccon_admin', '1', cookieOpts)
  }
  return res
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  const { email, password } = await req.json().catch(() => ({}))
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const secret = process.env.RACCON_AUTH_SECRET || 'raccon_dev_secret'
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  // 1. Admin env-var credentials (always works even if Airtable is down)
  if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
    return setAuthCookies(NextResponse.json({ ok: true }), secret, true)
  }

  // 2. Airtable users table
  try {
    const UsersTable = getUsersTable()
    const records = await UsersTable.select({
      filterByFormula: `AND({email} = '${email.toLowerCase().replace(/'/g, "\\'")}', {active} = TRUE())`,
      maxRecords: 1,
    }).firstPage()

    if (records.length > 0) {
      const stored = (records[0].get('password_hash') as string) || ''
      if (verifyPassword(password, stored)) {
        return setAuthCookies(NextResponse.json({ ok: true }), secret, false)
      }
    }
  } catch {
    // Airtable down — fall through
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}
