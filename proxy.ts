import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/signup', '/api/auth']
const CRON_PATH = '/api/cron'
const ADMIN_PATH = '/admin'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow cron routes (they use their own CRON_SECRET)
  if (pathname.startsWith(CRON_PATH)) return NextResponse.next()

  // Always allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next()

  const secret = process.env.RACCON_AUTH_SECRET || 'raccon_dev_secret'
  const authCookie = req.cookies.get('raccon_auth')?.value

  // Not authenticated — send to login
  if (authCookie !== secret) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated — check admin routes
  if (pathname.startsWith(ADMIN_PATH) || pathname.startsWith('/api/admin')) {
    const adminCookie = req.cookies.get('raccon_admin')?.value
    if (adminCookie !== '1') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$).*)',
  ],
}
