'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RacconMark } from '@/components/RacconLogo'

function StrengthBar({ password }: { password: string }) {
  if (!password) return null
  const score = [password.length >= 8, /[A-Z]/.test(password), /[0-9!@#$%^&*]/.test(password)].filter(Boolean).length
  const colors = ['#ef4444', '#f59e0b', '#10b981'] as const
  const labels = ['Weak', 'Fair', 'Strong'] as const
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="flex gap-1 flex-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? colors[score - 1] : 'rgba(255,255,255,0.07)' }} />
        ))}
      </div>
      <span className="text-[11px] font-mono w-10 text-right" style={{ color: colors[score - 1] }}>
        {labels[score - 1]}
      </span>
    </div>
  )
}

function SignupForm() {
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
  }
  const focusStyle = {
    border: '1px solid rgba(124,58,237,0.6)',
    boxShadow: '0 0 0 3px rgba(124,58,237,0.1)',
  }
  const blurStyle = {
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: 'none',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords don't match"); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, inviteCode }),
      })
      if (res.ok) {
        window.location.href = from
      } else {
        const data = await res.json()
        setError(data.error || 'Sign up failed. Try again.')
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
          Already have an account?{' '}
          <Link href="/login" className="text-white hover:text-violet-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>

      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px] space-y-7">

          <div className="space-y-1.5">
            <h1 className="text-[28px] font-bold text-white tracking-tight">Create your account</h1>
            <p className="text-[14px]" style={{ color: 'rgba(113,113,122,0.9)' }}>
              Start tracking competitor ads today.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium" style={{ color: 'rgba(161,161,170,0.9)' }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoFocus autoComplete="email" placeholder="you@company.com"
                className="w-full h-10 rounded-lg px-3.5 text-[14px] text-white placeholder:text-zinc-700 focus:outline-none transition-all"
                style={inputStyle}
                onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium" style={{ color: 'rgba(161,161,170,0.9)' }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="new-password" placeholder="Min. 8 characters"
                className="w-full h-10 rounded-lg px-3.5 text-[14px] text-white placeholder:text-zinc-700 focus:outline-none transition-all"
                style={inputStyle}
                onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
              />
              <StrengthBar password={password} />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium" style={{ color: 'rgba(161,161,170,0.9)' }}>Confirm password</label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                required autoComplete="new-password" placeholder="••••••••••"
                className="w-full h-10 rounded-lg px-3.5 text-[14px] text-white placeholder:text-zinc-700 focus:outline-none transition-all"
                style={inputStyle}
                onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium" style={{ color: 'rgba(161,161,170,0.9)' }}>Invite code</label>
              <input
                type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                required autoComplete="off" placeholder="raccon-beta-XXXX"
                className="w-full h-10 rounded-lg px-3.5 text-[14px] text-white placeholder:text-zinc-700 focus:outline-none transition-all"
                style={inputStyle}
                onFocus={e => Object.assign(e.currentTarget.style, focusStyle)}
                onBlur={e => Object.assign(e.currentTarget.style, blurStyle)}
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
                  Create account
                  <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
                    <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="text-[12px] text-center" style={{ color: 'rgba(63,63,70,0.9)' }}>
            By creating an account you agree to our terms of service.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
