'use client'

import React from 'react'
import Link from 'next/link'
import { RacconMark } from '@/components/RacconLogo'

type Props = {
  headline: React.ReactNode
  sub: string
  stats: { value: string; label: string }[]
}

export function AuthPanel({ headline, sub, stats }: Props) {
  return (
    <div className="hidden lg:flex lg:w-[52%] relative flex-col overflow-hidden select-none"
      style={{ background: '#07070c' }}>

      {/* Background atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 90% 70% at 25% 55%, rgba(255,56,56,0.15) 0%, transparent 65%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 50% 40% at 75% 80%, rgba(220,20,20,0.08) 0%, transparent 60%)',
        }} />
        {/* Grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px',
        }} />
        {/* Rings */}
        {[520, 380, 240].map((size, i) => (
          <div key={size} className="absolute top-1/2 left-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: size, height: size,
              border: `1px solid rgba(255,56,56,${0.06 + i * 0.04})`,
            }} />
        ))}
        {/* Center glow */}
        <div className="absolute top-1/2 left-[42%] -translate-x-1/2 -translate-y-[58%] w-32 h-32 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,56,56,0.25) 0%, transparent 70%)' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-14">

        {/* Logo + back link */}
        <div className="flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5 group">
            <RacconMark size={28} />
            <span className="text-[14px] font-bold text-white tracking-tight">Whitepaper</span>
          </Link>
          <Link href="/login"
            className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors">
            <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to home
          </Link>
        </div>

        {/* Main copy */}
        <div className="flex-1 flex flex-col justify-center max-w-md space-y-8">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff3838] animate-pulse" />
            <span className="text-[11px] font-mono text-[#ff5555] uppercase tracking-widest">Ad Intelligence</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-[44px] font-bold text-white leading-[1.08] tracking-tight">
              {headline}
            </h1>
            <p className="text-[15px] text-zinc-400 leading-relaxed max-w-xs">{sub}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-0 pt-2">
            {stats.map(({ value, label }, i) => (
              <div key={label} className={`space-y-1 ${i > 0 ? 'border-l border-white/[0.06] pl-5' : ''}`}>
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-[11px] text-zinc-500 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Decorative ad card preview */}
          <div className="space-y-2 pt-2 opacity-60">
            {[
              { brand: 'The Atlantic', days: '72d', score: 9, hook: 'Social Proof' },
              { brand: 'Bloomberg', days: '45d', score: 8, hook: 'Benefit' },
            ].map(ad => (
              <div key={ad.brand} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-8 h-8 rounded-lg shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(255,56,56,0.15), rgba(220,20,20,0.1))' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-zinc-300 truncate">{ad.brand}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-mono bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full">{ad.days}</span>
                      <span className="text-[9px] font-mono font-bold" style={{ color: '#10b981' }}>{ad.score}/10</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-500">{ad.hook}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-zinc-800">© 2025 Whitepaper</p>
      </div>
    </div>
  )
}
