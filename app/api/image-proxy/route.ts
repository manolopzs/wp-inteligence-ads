import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
]

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url', { status: 400 })

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; bot)',
        Referer: 'https://www.facebook.com/',
      },
    })

    if (!res.ok) return new NextResponse('Failed to fetch media', { status: res.status })

    const rawType = res.headers.get('content-type') || 'image/jpeg'
    const contentType = rawType.split(';')[0].trim()

    if (!ALLOWED_TYPES.some(t => contentType.startsWith(t.split('/')[0]))) {
      return new NextResponse('Unsupported media type', { status: 415 })
    }

    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Media fetch error', { status: 500 })
  }
}
