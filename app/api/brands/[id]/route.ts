import { NextRequest, NextResponse } from 'next/server'
import { getBrandsTable } from '@/lib/airtable'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await getBrandsTable().destroy(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
