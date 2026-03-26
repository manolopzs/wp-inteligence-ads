import { NextRequest, NextResponse } from 'next/server'
import { getBrandsTable, getAdsTable } from '@/lib/airtable'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    // Get brand name to find associated ads
    const brand = await getBrandsTable().find(id)
    const brandName = brand.get('name') as string

    // Delete all ads for this brand in batches of 10 (Airtable limit)
    if (brandName) {
      const ads = await getAdsTable()
        .select({ filterByFormula: `{brand_name} = '${brandName.replace(/'/g, "\\'")}'`, fields: [] })
        .all()

      const ids = ads.map(r => r.id)
      for (let i = 0; i < ids.length; i += 10) {
        await getAdsTable().destroy(ids.slice(i, i + 10) as [string, ...string[]])
      }
    }

    await getBrandsTable().destroy(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
