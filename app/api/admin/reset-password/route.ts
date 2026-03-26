import { NextRequest, NextResponse } from 'next/server'
import { getUsersTable, USERS_FIELDS } from '@/lib/airtable'
import { hashPassword } from '@/lib/auth'
import { randomBytes } from 'crypto'

// POST /api/admin/reset-password — generate a temp password for a user
export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Generate a readable temp password: e.g. "WP-a3f7b2"
    const suffix = randomBytes(3).toString('hex')
    const tempPassword = `WP-${suffix}`

    await getUsersTable().update(id, {
      [USERS_FIELDS.password_hash]: hashPassword(tempPassword),
    })

    return NextResponse.json({ tempPassword })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
