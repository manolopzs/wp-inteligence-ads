'use client'

import { useEffect } from 'react'

type ToastProps = {
  message: string
  type?: 'success' | 'error' | 'info'
  onDismiss: () => void
}

export function Toast({ message, type = 'info', onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2500)
    return () => clearTimeout(t)
  }, [onDismiss])

  const styles = {
    success: 'bg-emerald-900/90 border-emerald-700/50 text-emerald-200',
    error: 'bg-red-900/90 border-red-700/50 text-red-200',
    info: 'bg-zinc-900/90 border-zinc-700/50 text-zinc-200',
  }

  const icons = { success: '✓', error: '✕', info: '·' }

  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-xl text-[13px] font-mono animate-in fade-in slide-in-from-bottom-2 duration-200 ${styles[type]}`}>
      <span className="font-bold">{icons[type]}</span>
      {message}
    </div>
  )
}
