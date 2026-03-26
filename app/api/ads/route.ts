import { NextRequest, NextResponse } from 'next/server'
import { getAds } from '@/lib/airtable'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const brand = searchParams.getAll('brand')
    const category = searchParams.getAll('category')
    const media_type = searchParams.get('media_type') || undefined
    const hook_type = searchParams.get('hook_type') || undefined
    const copy_angle = searchParams.get('copy_angle') || undefined
    const offer_type = searchParams.get('offer_type') || undefined
    const bookmarked = searchParams.get('bookmarked') === 'true' ? true : undefined

    const ads = await getAds({
      brand: brand.length ? brand : undefined,
      category: category.length ? category : undefined,
      media_type,
      hook_type,
      copy_angle,
      offer_type,
      bookmarked,
    })

    return NextResponse.json(ads)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
