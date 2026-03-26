import { NextRequest, NextResponse } from 'next/server'
import { getUsersTable, USERS_FIELDS } from '@/lib/airtable'

// GET /api/admin/users — list all users
export async function GET() {
  try {
    const records = await getUsersTable()
      .select({ sort: [{ field: 'created_at', direction: 'desc' }] })
      .all()

    const users = records.map(r => ({
      id: r.id,
      email: (r.get('email') as string) || '',
      created_at: (r.get('created_at') as string) || '',
      active: (r.get('active') as boolean) || false,
    }))

    return NextResponse.json(users)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/admin/users — create a user (admin-side account creation)
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const UsersTable = getUsersTable()

    const existing = await UsersTable.select({
      filterByFormula: `{email} = '${email.toLowerCase().replace(/'/g, "\\'")}'`,
      maxRecords: 1,
    }).firstPage()

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }

    const { hashPassword } = await import('@/lib/auth')
    const record = await UsersTable.create({
      [USERS_FIELDS.email]: email.toLowerCase(),
      [USERS_FIELDS.password_hash]: hashPassword(password),
      [USERS_FIELDS.created_at]: new Date().toISOString().split('T')[0],
      [USERS_FIELDS.active]: true,
    })

    return NextResponse.json({ id: record.id, email: email.toLowerCase() })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// PATCH /api/admin/users — toggle active status
export async function PATCH(req: NextRequest) {
  try {
    const { id, active } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await getUsersTable().update(id, { [USERS_FIELDS.active]: active })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
