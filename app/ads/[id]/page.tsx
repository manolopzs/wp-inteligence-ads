'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import type { Ad } from '@/lib/airtable'
import { brandColor, scoreColor, humanize, daysAgo, formatDays } from '@/lib/ui'
import { HOOK_COLORS, ANGLE_COLORS, TAG_STYLES } from '@/lib/colors'

function ScoreGauge({ score }: { score: number }) {
  const color = scoreColor(score)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score * 10}%`, backgroundColor: color }} />
      </div>
      <span className="text-xl font-bold font-mono tabular-nums" style={{ color }}>{score}/10</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">{label}</p>
      <div>{children}</div>
    </div>
  )
}

function Tag({ children, color = 'zinc' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-mono font-medium ${TAG_STYLES[color] || TAG_STYLES.zinc}`}>
      {children}
    </span>
  )
}

function renderBrief(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**'))
      return <p key={i} className="text-[10px] font-mono font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-5 first:mt-0">{line.replace(/\*\*/g, '')}</p>
    if (!line.trim()) return null
    return <p key={i} className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">{line}</p>
  })
}

export default function AdDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [ad, setAd] = useState<Ad | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookmarked, setBookmarked] = useState(false)
  const [analyzeStatus, setAnalyzeStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [brief, setBrief] = useState('')
  const [briefStatus, setBriefStatus] = useState<'idle' | 'loading' | 'error' | 'copied'>('idle')

  useEffect(() => {
    fetch(`/api/ads/${id}`)
      .then(r => r.json())
      .then(data => { setAd(data); setBookmarked(data.bookmarked) })
      .finally(() => setLoading(false))
  }, [id])

  async function handleAnalyze() {
    setAnalyzeStatus('loading')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: id }),
      })
      if (!res.ok) throw new Error()
      setAd(await fetch(`/api/ads/${id}`).then(r => r.json()))
      setAnalyzeStatus('idle')
    } catch { setAnalyzeStatus('error') }
  }

  async function handleBookmark() {
    const next = !bookmarked
    setBookmarked(next)
    await fetch('/api/bookmark', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId: id, bookmarked: next }),
    })
  }

  async function handleGenerateBrief() {
    setBriefStatus('loading'); setBrief('')
    try {
      const res = await fetch('/api/brief', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: id }),
      })
      if (!res.ok) throw new Error()
      setBrief((await res.json()).brief || '')
      setBriefStatus('idle')
    } catch { setBriefStatus('error') }
  }

  async function handleCopyBrief() {
    if (!brief) return
    await navigator.clipboard.writeText(brief)
    setBriefStatus('copied')
    setTimeout(() => setBriefStatus('idle'), 2000)
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="max-w-5xl mx-auto animate-pulse space-y-4">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          <div className="lg:col-span-2 space-y-3">
            <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
            <div className="h-56 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )

  if (!ad) return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-zinc-500 font-mono text-sm">Ad not found</p>
        <Link href="/dashboard" className="text-xs text-zinc-400 underline underline-offset-2">← Back</Link>
      </div>
    </div>
  )

  const color = brandColor(ad.brand_name || '')

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-5xl mx-auto p-5 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              ← Dashboard
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{ad.brand_name}</span>
              </div>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="text-xs font-mono text-zinc-400 capitalize">{ad.media_type}</span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="text-xs font-mono text-zinc-400">#{ad.impressions_rank} reach</span>
              {ad.ad_start_date && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <span className={`text-xs font-mono font-semibold ${daysAgo(ad.ad_start_date) >= 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
                    {formatDays(daysAgo(ad.ad_start_date))} running
                  </span>
                </>
              )}
              {ad.is_active && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded-full">Active</span>
              )}
              {ad.ai_analyzed && ad.whitepaper_overlap_score > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${color}20`, color }}>
                  {ad.whitepaper_overlap_score}/10 fit
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 leading-snug max-w-2xl">
              {ad.headline || <span className="text-zinc-400 italic font-normal">No headline</span>}
            </h1>
          </div>
          <button onClick={handleBookmark} className="shrink-0 w-9 h-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
            <span className={`text-base ${bookmarked ? 'text-yellow-400' : 'text-zinc-300 dark:text-zinc-600'}`}>{bookmarked ? '★' : '☆'}</span>
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Media */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              {ad.media_type === 'video' ? (
                <div className="bg-zinc-950 rounded-2xl overflow-hidden">
                  {ad.media_url
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    ? <video src={ad.media_url} poster={ad.thumbnail_url || undefined} controls className="w-full max-h-[500px]" />
                    : <div className="aspect-video flex items-center justify-center text-zinc-500 font-mono text-sm">No video available</div>
                  }
                </div>
              ) : ad.media_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.media_url} alt={ad.headline || ''} className="w-full rounded-2xl" />
              ) : (
                <div className="aspect-video flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-mono text-sm rounded-2xl">No media</div>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 px-1 flex-wrap">
              <span>Scraped {ad.scraped_at?.split('T')[0] || '—'}</span>
              {ad.ad_library_url && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <a href={ad.ad_library_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                    View in Meta Ad Library ↗
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4">

            {/* Ad Copy */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">Ad Copy</p>
              {ad.headline && <Field label="Headline"><p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">{ad.headline}</p></Field>}
              {ad.body_copy && <Field label="Body"><p className="text-[13px] text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">{ad.body_copy}</p></Field>}
              {ad.cta_text  && <Field label="CTA"><span className="inline-block text-xs font-semibold font-mono bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 rounded-lg">{ad.cta_text}</span></Field>}
              {!ad.headline && !ad.body_copy && !ad.cta_text && <p className="text-xs font-mono text-zinc-400 italic">No copy available</p>}
            </div>

            {/* AI Analysis */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">AI Analysis</p>
                {ad.ai_analyzed && <span className="text-[10px] font-mono text-emerald-500">✓ Analyzed</span>}
              </div>
              {ad.ai_analyzed ? (
                <div className="space-y-4">
                  {ad.whitepaper_overlap_score > 0 && <Field label="Brand Fit Score"><ScoreGauge score={ad.whitepaper_overlap_score} /></Field>}
                  {ad.ai_summary && <Field label="Insight"><p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{ad.ai_summary}</p></Field>}
                  <div className="grid grid-cols-2 gap-3">
                    {ad.hook_type  && <Field label="Hook"><Tag  color={HOOK_COLORS[ad.hook_type]   || 'zinc'}>{humanize(ad.hook_type)}</Tag></Field>}
                    {ad.copy_angle && <Field label="Angle"><Tag color={ANGLE_COLORS[ad.copy_angle] || 'zinc'}>{humanize(ad.copy_angle)}</Tag></Field>}
                    {ad.offer_type && <Field label="Offer"><Tag>{humanize(ad.offer_type)}</Tag></Field>}
                    {ad.format     && <Field label="Format"><Tag>{humanize(ad.format)}</Tag></Field>}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 font-mono">Not analyzed yet.</p>
                  <button onClick={handleAnalyze} disabled={analyzeStatus === 'loading'}
                    className={`w-full text-sm py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 ${
                      analyzeStatus === 'error'
                        ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
                        : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300'
                    }`}>
                    {analyzeStatus === 'loading' ? '⏳ Analyzing...' : analyzeStatus === 'error' ? '↺ Failed — Retry' : '✦ Analyze with AI'}
                  </button>
                </div>
              )}
            </div>

            {/* Creative Brief */}
            {ad.ai_analyzed && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">Creative Brief</p>
                  {brief && (
                    <div className="flex items-center gap-3">
                      <button onClick={handleGenerateBrief} disabled={briefStatus === 'loading'} className="text-[10px] font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors disabled:opacity-40">
                        {briefStatus === 'loading' ? '...' : '↺ Regenerate'}
                      </button>
                      <button onClick={handleCopyBrief} className="text-[10px] font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                        {briefStatus === 'copied' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
                {brief ? (
                  <div className="space-y-1">{renderBrief(brief)}</div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[12px] text-zinc-400 font-mono leading-relaxed">Generate a brief your copywriter can use to make an ad inspired by this one.</p>
                    <button onClick={handleGenerateBrief} disabled={briefStatus === 'loading'}
                      className={`w-full text-sm py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 ${
                        briefStatus === 'error'
                          ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
                          : 'text-white hover:opacity-90'
                      }`}
                      style={briefStatus === 'error' ? undefined : { background: '#ff3838' }}>
                      {briefStatus === 'loading' ? '⏳ Generating...' : briefStatus === 'error' ? '↺ Failed — Retry' : '✦ Generate Creative Brief'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
