'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

type Theme = 'dark' | 'light'
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const html = document.documentElement
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved) {
      setTheme(saved)
      html.classList.toggle('dark', saved === 'dark')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    const html = document.documentElement

    // Add transition class, flip theme, remove after transition finishes
    html.classList.add('theme-switching')
    setTheme(next)
    localStorage.setItem('theme', next)
    html.classList.toggle('dark', next === 'dark')

    setTimeout(() => html.classList.remove('theme-switching'), 400)
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext)
  const [spinning, setSpinning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleClick() {
    toggle()
    setSpinning(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSpinning(false), 500)
  }

  return (
    <button
      onClick={handleClick}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200"
      style={{ transition: 'background-color 0.2s, border-color 0.2s, color 0.2s' }}
    >
      <span
        style={{
          display: 'inline-flex',
          transform: spinning ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {theme === 'dark' ? (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="w-3.5 h-3.5">
            <circle cx="8" cy="8" r="2.5"/>
            <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M11.89 4.11l1.06-1.06M3.05 12.95l1.06-1.06"/>
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M6 .278a.768.768 0 01.08.858 7.208 7.208 0 00-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 01.81.316.733.733 0 01-.031.893A8.349 8.349 0 018.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 016 .278z"/>
          </svg>
        )}
      </span>
    </button>
  )
}
