'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import NavLinks from './NavLinks'
import { RacconMark } from './RacconLogo'
import { ThemeToggle } from './ThemeProvider'

function UserMenu() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    setLoading(true)
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    router.push('/login')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 pl-2 pr-3 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all group"
      >
        {/* Avatar */}
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-white border border-zinc-200 dark:border-zinc-600">
          <span className="text-[9px] font-bold text-zinc-800">W</span>
        </div>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl shadow-lg shadow-zinc-200/50 dark:shadow-zinc-950/50 overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">Signed in as</p>
            <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">Whitepaper user</p>
          </div>
          <div className="p-1">
            <Link
              href="/brands"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 7.5L8 2l6 5.5V14a.5.5 0 01-.5.5h-3.75V11h-3.5v3.5H2.5A.5.5 0 012 14V7.5z" strokeLinejoin="round" />
              </svg>
              Manage brands
            </Link>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5">
                <path d="M10.5 11.5l3-3-3-3M13.5 8.5H6M6 2.5H3a.5.5 0 00-.5.5v10a.5.5 0 00.5.5h3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {loading ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AppShell({ children, isAdmin }: { children: React.ReactNode; isAdmin?: boolean }) {
  const pathname = usePathname()
  const isAuth = pathname === '/login' || pathname === '/signup' || pathname === '/'

  if (isAuth) return <>{children}</>

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="flex items-stretch justify-between pl-5 pr-4 h-14">

          {/* Left: logo + nav */}
          <div className="flex items-stretch gap-0">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2.5 pr-5 mr-2 shrink-0 group">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style={{ background: '#ff3838' }}>
                <RacconMark size={16} className="text-white" />
              </div>
              <span className="text-[14px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-[#ff3838] transition-colors">
                Whitepaper
              </span>
            </Link>

            {/* Divider */}
            <div className="w-px my-3.5 bg-zinc-200 dark:bg-zinc-800 shrink-0" />

            {/* Nav */}
            <div className="pl-2">
              <NavLinks isAdmin={isAdmin} />
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />
            <UserMenu />
          </div>

        </div>
      </header>
      <main>{children}</main>
    </>
  )
}
