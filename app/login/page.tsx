'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RacconMark } from '@/components/RacconLogo'

function LoginForm() {
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        window.location.href = from
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid email or password')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-6">
        <Link href="/landing" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <RacconMark size={24} />
          <span className="text-[14px] font-bold text-white tracking-tight">Raccon</span>
        </Link>
        <p className="text-[13px]" style={{ color: 'rgba(113,113,122,0.9)' }}>
          No account?{' '}
          <Link href="/signup" className="text-white hover:text-violet-300 transition-colors font-medium">
            Sign up
          </Link>
        </p>
      </div>

      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px] space-y-7">

          <div className="space-y-1.5">
            <h1 className="text-[28px] font-bold text-white tracking-tight">Welcome back</h1>
            <p className="text-[14px]" style={{ color: 'rgba(113,113,122,0.9)' }}>
              Sign in to your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium" style={{ color: 'rgba(161,161,170,0.9)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full h-10 rounded-lg px-3.5 text-[14px] text-white placeholder:text-zinc-700 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
                onFocus={e => {
                  e.currentTarget.style.border = '1px solid rgba(124,58,237,0.6)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'
                }}
                onBlur={e => {
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium" style={{ color: 'rgba(161,161,170,0.9)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••••"
                className="w-full h-10 rounded-lg px-3.5 text-[14px] text-white placeholder:text-zinc-700 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
                onFocus={e => {
                  e.currentTarget.style.border = '1px solid rgba(124,58,237,0.6)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'
                }}
                onBlur={e => {
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-400 pt-0.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg text-[14px] font-semibold text-white transition-all duration-150 flex items-center justify-center gap-2 mt-1 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                boxShadow: '0 1px 20px rgba(124,58,237,0.35)',
              }}
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                  <path fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              ) : (
                <>
                  Sign in
                  <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
                    <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
