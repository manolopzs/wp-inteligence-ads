import { NextRequest, NextResponse } from 'next/server'
import { getAdById } from '@/lib/airtable'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const ad = await getAdById(id)
    if (!ad) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(ad)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
