import { NextRequest, NextResponse } from 'next/server'
import { getBrandsTable, BRANDS_FIELDS } from '@/lib/airtable'

export async function GET() {
  try {
    const records = await getBrandsTable()
      .select({ sort: [{ field: 'name', direction: 'asc' }] })
      .all()

    const brands = records.map((r) => ({
      id: r.id,
      name: (r.get('name') as string) || '',
      ad_library_url: (r.get('ad_library_url') as string) || '',
      category: (r.get('category') as string) || '',
      last_scraped: (r.get('last_scraped') as string) || null,
      active: (r.get('active') as boolean) || false,
    }))

    return NextResponse.json(brands)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, ad_library_url, category } = await req.json()
    if (!name || !category) {
      return NextResponse.json({ error: 'name and category required' }, { status: 400 })
    }

    const record = await getBrandsTable().create({
      [BRANDS_FIELDS.name]: name,
      [BRANDS_FIELDS.ad_library_url]: ad_library_url || '',
      [BRANDS_FIELDS.category]: category,
      [BRANDS_FIELDS.active]: true,
    })

    return NextResponse.json({ id: record.id, name, category })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
