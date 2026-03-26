import { NextRequest, NextResponse } from 'next/server'
import { getUsersTable, USERS_FIELDS } from '@/lib/airtable'
import { hashPassword } from '@/lib/auth'
import { rateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 1 hour.' }, { status: 429 })
  }

  const { email, password, inviteCode } = await req.json().catch(() => ({}))

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Invite code gate
  const validCode = process.env.SIGNUP_INVITE_CODE
  if (validCode && inviteCode !== validCode) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 403 })
  }

  const UsersTable = getUsersTable()

  const existing = await UsersTable.select({
    filterByFormula: `{email} = '${email.toLowerCase().replace(/'/g, "\\'")}'`,
    maxRecords: 1,
  }).firstPage()

  if (existing.length > 0) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  const passwordHash = hashPassword(password)

  await UsersTable.create({
    [USERS_FIELDS.email]: email.toLowerCase(),
    [USERS_FIELDS.password_hash]: passwordHash,
    [USERS_FIELDS.created_at]: new Date().toISOString().split('T')[0],
    [USERS_FIELDS.active]: true,
  })

  // Auto-login after signup
  const secret = process.env.RACCON_AUTH_SECRET || 'raccon_dev_secret'
  const res = NextResponse.json({ ok: true })
  res.cookies.set('raccon_auth', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
