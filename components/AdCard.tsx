'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Ad } from '@/lib/airtable'
import { brandColor, scoreColor, scoreBg, humanize, daysAgo, formatDays } from '@/lib/ui'

type Props = {
  ad: Ad
  onAnalyze: (adId: string) => Promise<void>
  onBookmark: (adId: string, value: boolean) => Promise<void>
}

export function AdCard({ ad, onAnalyze, onBookmark }: Props) {
  const [analyzing, setAnalyzing] = useState(false)
  const [bookmarked, setBookmarked] = useState(ad.bookmarked)
  const [analyzeError, setAnalyzeError] = useState(false)

  async function handleAnalyze(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setAnalyzing(true); setAnalyzeError(false)
    try { await onAnalyze(ad.id) }
    catch { setAnalyzeError(true) }
    finally { setAnalyzing(false) }
  }

  async function handleBookmark(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    const next = !bookmarked
    setBookmarked(next)
    try { await onBookmark(ad.id, next) }
    catch { setBookmarked(!next) }
  }

  const thumbSrc = ad.media_type === 'video'
    ? (ad.thumbnail_url || ad.media_url)
    : ad.media_url

  const color = brandColor(ad.brand_name || '')
  const score = ad.whitepaper_overlap_score || 0
  const days = ad.ad_start_date ? daysAgo(ad.ad_start_date) : null
  const isNew = ad.scraped_at ? (Date.now() - new Date(ad.scraped_at).getTime()) < 48 * 60 * 60 * 1000 : false

  return (
    <Link href={`/ads/${ad.id}`} className="block group outline-none focus-visible:ring-2 focus-visible:ring-[#ff3838] rounded-xl">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 flex flex-col h-full">

        {/* Thumbnail */}
        <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
          {thumbSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbSrc}
              alt={ad.headline || ''}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-zinc-300 dark:text-zinc-700 text-[10px] font-mono uppercase tracking-widest">
                {ad.media_type || 'no media'}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Video play */}
          {ad.media_type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
          )}

          {/* Top left: rank + longevity + new */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className="text-[10px] font-mono bg-black/60 text-white/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
              #{ad.impressions_rank}
            </span>
            {days !== null && days >= 14 && (
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-sm font-semibold ${
                days >= 60 ? 'bg-emerald-500/85 text-white' :
                days >= 30 ? 'bg-amber-500/85 text-white' :
                'bg-black/60 text-white/70'
              }`}>
                {formatDays(days)}
              </span>
            )}
            {isNew && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-sm font-semibold bg-blue-500/90 text-white">
                New
              </span>
            )}
          </div>

          {/* Bookmark — top right */}
          <button
            onClick={handleBookmark}
            className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
          >
            <span className={`text-xs leading-none ${bookmarked ? 'text-yellow-400' : 'text-white/50'}`}>
              {bookmarked ? '★' : '☆'}
            </span>
          </button>

          {/* Score badge — bottom right */}
          {score > 0 && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[11px] font-bold font-mono"
              style={{ background: scoreBg(score), color: scoreColor(score), backdropFilter: 'blur(4px)' }}>
              {score}/10
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col gap-1.5 flex-1">

          {/* Brand row */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-mono text-zinc-400 truncate flex-1">{ad.brand_name}</span>
            {ad.media_type && (
              <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-600 shrink-0 capitalize">{ad.media_type}</span>
            )}
          </div>

          {/* Headline */}
          <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-snug">
            {ad.headline || <span className="italic font-normal text-zinc-400">No headline</span>}
          </p>

          {/* AI summary */}
          {ad.ai_analyzed && ad.ai_summary && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-snug">
              {ad.ai_summary}
            </p>
          )}

          {/* Tags */}
          {ad.ai_analyzed && (ad.hook_type || ad.copy_angle) && (
            <div className="flex flex-wrap gap-1 mt-auto pt-1">
              {ad.hook_type && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 capitalize">
                  {humanize(ad.hook_type)}
                </span>
              )}
              {ad.copy_angle && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 capitalize">
                  {humanize(ad.copy_angle)}
                </span>
              )}
            </div>
          )}

          {/* Analyze button */}
          {!ad.ai_analyzed && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className={`mt-auto w-full text-[11px] py-1.5 rounded-lg font-mono transition-all disabled:opacity-50 border ${
                analyzeError
                  ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {analyzing ? 'Analyzing...' : analyzeError ? '↺ Retry' : '✦ Analyze'}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
