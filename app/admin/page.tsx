'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type User = {
  id: string
  email: string
  created_at: string
  active: boolean
}

type NewUserForm = { email: string; password: string }

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({})
  const [toggling, setToggling] = useState<string | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<NewUserForm>({ email: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const inviteCode = process.env.NEXT_PUBLIC_SIGNUP_INVITE_CODE ?? '(set in Vercel env vars)'

  async function fetchUsers() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function toggleActive(user: User) {
    setToggling(user.id)
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, active: !user.active }),
      })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !u.active } : u))
    } finally {
      setToggling(null)
    }
  }

  async function resetPassword(user: User) {
    setResetting(user.id)
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id }),
      })
      const data = await res.json()
      if (data.tempPassword) {
        setTempPasswords(prev => ({ ...prev, [user.id]: data.tempPassword }))
      }
    } finally {
      setResetting(null)
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create user')
      } else {
        setForm({ email: '', password: '' })
        setShowCreate(false)
        fetchUsers()
      }
    } finally {
      setCreating(false)
    }
  }

  const activeCount = users.filter(u => u.active).length

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-xs font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                ← Dashboard
              </Link>
            </div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1 tracking-tight">Admin</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {loading ? 'Loading...' : `${users.length} users · ${activeCount} active`}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(s => !s)}
            className="text-xs font-mono px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {showCreate ? '✕ Cancel' : '+ Create user'}
          </button>
        </div>

        {/* Invite code banner */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-5 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono text-red-500 dark:text-red-400 uppercase tracking-wider mb-0.5">Beta invite code</p>
            <p className="text-sm font-mono font-semibold text-red-800 dark:text-red-200">
              {process.env.NODE_ENV === 'development' ? 'wp-beta-2026' : '(check Vercel env: SIGNUP_INVITE_CODE)'}
            </p>
          </div>
          <p className="text-[11px] text-red-500 dark:text-red-400 text-right leading-snug max-w-xs">
            Share this with users to allow signup. Change <code className="font-mono">SIGNUP_INVITE_CODE</code> in Vercel to rotate it.
          </p>
        </div>

        {/* Create user form */}
        {showCreate && (
          <form onSubmit={createUser} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">Create User</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                required
                type="email"
                placeholder="user@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
              />
              <input
                required
                type="text"
                placeholder="Temporary password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
            {createError && <p className="text-sm text-red-500 font-mono">{createError}</p>}
            <button
              type="submit"
              disabled={creating}
              className="text-xs font-mono px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create user'}
            </button>
          </form>
        )}

        {/* Users table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-mono text-zinc-400">No users yet. Create one above or share the invite code.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left px-5 py-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Joined</th>
                  <th className="text-left px-5 py-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-sm text-zinc-800 dark:text-zinc-200">{user.email}</span>
                      {tempPasswords[user.id] && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] font-mono text-zinc-400">Temp password:</span>
                          <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                            {tempPasswords[user.id]}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400">(shown once)</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="text-xs font-mono text-zinc-400">{user.created_at || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                        user.active
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500'
                      }`}>
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => resetPassword(user)}
                          disabled={resetting === user.id}
                          className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all disabled:opacity-40"
                        >
                          {resetting === user.id ? '...' : 'Reset pwd'}
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          disabled={toggling === user.id}
                          className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all disabled:opacity-40 ${
                            user.active
                              ? 'border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'border-emerald-200 dark:border-emerald-900/50 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                          }`}
                        >
                          {toggling === user.id ? '...' : user.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total users', value: users.length },
            { label: 'Active', value: activeCount },
            { label: 'Inactive', value: users.length - activeCount },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
