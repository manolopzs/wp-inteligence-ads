import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  const clearOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  }
  res.cookies.set('raccon_auth', '', clearOpts)
  res.cookies.set('raccon_admin', '', clearOpts)
  return res
}
