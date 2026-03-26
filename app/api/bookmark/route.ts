import { NextRequest, NextResponse } from 'next/server'
import { getAdsTable, ADS_FIELDS } from '@/lib/airtable'

export async function POST(req: NextRequest) {
  try {
    const { adId, bookmarked } = await req.json()
    if (!adId) return NextResponse.json({ error: 'adId required' }, { status: 400 })

    await getAdsTable().update(adId, { [ADS_FIELDS.bookmarked]: bookmarked })
    return NextResponse.json({ success: true, bookmarked })
  } catch (err) {
    console.error('[bookmark]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
