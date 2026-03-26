'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { AdCard } from '@/components/AdCard'
import { FilterBar } from '@/components/FilterBar'
import { Toast } from '@/components/Toast'
import type { Ad } from '@/lib/airtable'

type Filters = {
  brands: string[]
  category: string
  media_type: string
  hook_type: string
  copy_angle: string
  offer_type: string
  bookmarked: boolean
  new_only: boolean
  sort: string
}

const DEFAULT_FILTERS: Filters = {
  brands: [],
  category: '',
  media_type: '',
  hook_type: '',
  copy_angle: '',
  offer_type: '',
  bookmarked: false,
  new_only: false,
  sort: 'impressions_rank',
}

function isNewAd(scrapedAt: string): boolean {
  if (!scrapedAt) return false
  return (Date.now() - new Date(scrapedAt).getTime()) < 48 * 60 * 60 * 1000
}

type AnalyzeState = {
  running: boolean
  total: number
  current: number
  analyzed: number
  errors: number
  currentBrand: string
  currentHeadline: string
  done: boolean
}

const IDLE: AnalyzeState = {
  running: false, total: 0, current: 0, analyzed: 0, errors: 0,
  currentBrand: '', currentHeadline: '', done: false,
}


export default function Dashboard() {
  const [ads, setAds] = useState<Ad[]>([])
  const [allAds, setAllAds] = useState<Ad[]>([]) // unfiltered, for stats
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')
  const [brandNames, setBrandNames] = useState<string[]>([])
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>(IDLE)
  const abortRef = useRef<AbortController | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    setToast({ message, type })
  }

  // Fetch all ads once for stats, filtered ads for display
  const fetchAds = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      filters.brands.forEach((b) => params.append('brand', b))
      if (filters.category) params.set('category', filters.category)
      if (filters.media_type) params.set('media_type', filters.media_type)
      if (filters.hook_type) params.set('hook_type', filters.hook_type)
      if (filters.copy_angle) params.set('copy_angle', filters.copy_angle)
      if (filters.offer_type) params.set('offer_type', filters.offer_type)
      if (filters.bookmarked) params.set('bookmarked', 'true')

      const [filtered, all] = await Promise.all([
        fetch(`/api/ads?${params}`).then(r => r.json()),
        allAds.length === 0 ? fetch('/api/ads').then(r => r.json()) : Promise.resolve(allAds),
      ])

      if (Array.isArray(filtered)) {
        setAds(filtered)
        const names = [...new Set(filtered.map((a: Ad) => a.brand_name).filter(Boolean))].sort() as string[]
        if (names.length > brandNames.length) setBrandNames(names)
      }
      if (Array.isArray(all) && allAds.length === 0) setAllAds(all)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  useEffect(() => { fetchAds() }, [fetchAds])

  // Refresh allAds after analysis completes
  const refreshAll = useCallback(async () => {
    const all = await fetch('/api/ads').then(r => r.json())
    if (Array.isArray(all)) setAllAds(all)
    await fetchAds()
  }, [fetchAds])

  async function handleAnalyze(adId: string) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId }),
    })
    if (!res.ok) { showToast('Analysis failed', 'error'); throw new Error('Analysis failed') }
    showToast('Analysis complete', 'success')
    await refreshAll()
  }

  async function handleBookmark(adId: string, value: boolean) {
    await fetch('/api/bookmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId, bookmarked: value }),
    })
    showToast(value ? 'Saved' : 'Removed from saved', 'info')
  }

  async function handleAnalyzeAll() {
    if (analyzeState.running) {
      abortRef.current?.abort()
      setAnalyzeState(IDLE)
      return
    }

    const abort = new AbortController()
    abortRef.current = abort
    setAnalyzeState({ ...IDLE, running: true })

    try {
      // Analyze unanalyzed ads first, then any with no summary (bad prior analysis)
      const visibleUnanalyzedIds = ads
        .filter(a => !a.ai_analyzed || !a.ai_summary)
        .map(a => a.id)

      const res = await fetch('/api/analyze-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adIds: visibleUnanalyzedIds }),
        signal: abort.signal,
      })
      if (!res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'start') {
              setAnalyzeState(s => ({ ...s, total: event.total }))
            } else if (event.type === 'progress') {
              setAnalyzeState(s => ({ ...s, current: event.current, total: event.total, currentBrand: event.brand || '', currentHeadline: event.headline || '' }))
            } else if (event.type === 'analyzed') {
              setAnalyzeState(s => ({ ...s, analyzed: s.analyzed + 1 }))
            } else if (event.type === 'error') {
              setAnalyzeState(s => ({ ...s, errors: s.errors + 1 }))
            } else if (event.type === 'done') {
              setAnalyzeState(s => ({ ...s, running: false, done: true, analyzed: event.analyzed, errors: event.errors, total: event.total }))
              refreshAll()
            }
          } catch { /* skip */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setAnalyzeState(IDLE)
      } else {
        setAnalyzeState(s => ({ ...s, running: false, done: true }))
      }
    }
  }

  const base = allAds.length > 0 ? allAds : ads
  const totalAds = base.length
  const analyzedCount = base.filter(a => a.ai_analyzed).length
  const analyzedPct = totalAds > 0 ? Math.round((analyzedCount / totalAds) * 100) : 0
  const topScore = base.reduce((max, a) => Math.max(max, a.whitepaper_overlap_score || 0), 0)
  const brandCount = new Set(base.map(a => a.brand_name).filter(Boolean)).size
  const unanalyzedCount = ads.filter(a => !a.ai_analyzed || !a.ai_summary).length

  const q = search.trim().toLowerCase()
  const newFiltered = filters.new_only ? ads.filter(a => isNewAd(a.scraped_at)) : ads
  const searched = q
    ? newFiltered.filter(a =>
        (a.headline || '').toLowerCase().includes(q) ||
        (a.brand_name || '').toLowerCase().includes(q) ||
        (a.body_copy || '').toLowerCase().includes(q) ||
        (a.ai_summary || '').toLowerCase().includes(q)
      )
    : newFiltered

  const sorted = [...searched].sort((a, b) => {
    if (filters.sort === 'impressions_rank') return a.impressions_rank - b.impressions_rank
    if (filters.sort === 'scraped_at') return b.scraped_at.localeCompare(a.scraped_at)
    if (filters.sort === 'whitepaper_overlap_score') return b.whitepaper_overlap_score - a.whitepaper_overlap_score
    if (filters.sort === 'longevity') {
      // Oldest start date first = battle-tested ads (no date = treat as short-lived)
      const aDate = a.ad_start_date ? new Date(a.ad_start_date).getTime() : Date.now()
      const bDate = b.ad_start_date ? new Date(b.ad_start_date).getTime() : Date.now()
      return aDate - bDate
    }
    return 0
  })

  const progressPct = analyzeState.total > 0 ? Math.round((analyzeState.current / analyzeState.total) * 100) : 0

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* Compact top bar — stats + action */}
      <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800/80 px-6 py-3 flex items-center gap-4 flex-wrap">
        {loading ? (
          <span className="text-sm text-zinc-400 font-mono animate-pulse">Loading ads...</span>
        ) : (
          <>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
              {sorted.length} <span className="text-zinc-400 font-normal">ads</span>
              {sorted.length !== totalAds && <span className="text-zinc-400 font-normal"> of {totalAds}</span>}
            </span>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            <span className="text-sm text-zinc-400 dark:text-zinc-500 tabular-nums">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{brandCount}</span> brands
            </span>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            <span className="text-sm text-zinc-400 dark:text-zinc-500 tabular-nums">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{analyzedPct}%</span> analyzed
            </span>
            {topScore > 0 && (
              <>
                <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <span className="text-sm text-zinc-400 dark:text-zinc-500">
                  top fit <span className="font-medium text-orange-500">{topScore}/10</span>
                </span>
              </>
            )}
          </>
        )}

        {!loading && unanalyzedCount > 0 && (
          <button
            onClick={handleAnalyzeAll}
            className={`ml-auto shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-mono font-medium transition-all border ${
              analyzeState.running
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50'
                : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 hover:bg-zinc-700 dark:hover:bg-zinc-300'
            }`}
          >
            {analyzeState.running
              ? <><span className="animate-spin inline-block">⏳</span> Stop</>
              : <>✦ Analyze visible <span className="opacity-60">({unanalyzedCount})</span></>
            }
          </button>
        )}

        {/* Progress bar — spans full width when running */}
        {(analyzeState.running || analyzeState.done) && (
          <div className="w-full flex items-center gap-3 pt-1">
            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate min-w-0 flex-1">
              {analyzeState.done ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  ✓ Done — {analyzeState.analyzed} analyzed{analyzeState.errors > 0 ? `, ${analyzeState.errors} errors` : ''}
                </span>
              ) : analyzeState.currentBrand ? (
                <>
                  <span className="text-zinc-400">{analyzeState.current}/{analyzeState.total}</span>
                  {' · '}<span className="font-semibold text-zinc-700 dark:text-zinc-300">{analyzeState.currentBrand}</span>
                  {analyzeState.currentHeadline && <span className="text-zinc-400"> — {analyzeState.currentHeadline}</span>}
                </>
              ) : 'Starting...'}
            </div>
            {analyzeState.analyzed > 0 && <span className="text-[11px] font-mono text-emerald-500 shrink-0">✓ {analyzeState.analyzed}</span>}
            {analyzeState.errors > 0 && <span className="text-[11px] font-mono text-red-500 shrink-0">✗ {analyzeState.errors}</span>}
            {analyzeState.done && (
              <button onClick={() => setAnalyzeState(IDLE)} className="text-[10px] font-mono text-zinc-400 hover:text-zinc-600 shrink-0">✕</button>
            )}
            {!analyzeState.done && analyzeState.total > 0 && (
              <div className="w-32 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                <div className="h-full bg-zinc-800 dark:bg-zinc-200 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
            )}
          </div>
        )}
      </div>

      <FilterBar filters={filters} onChange={setFilters} brandNames={brandNames} search={search} onSearchChange={setSearch} />

      <div className="p-5">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800" />
                <div className="p-3 space-y-2">
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full w-1/2" />
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full w-4/5" />
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-xl">📭</div>
            {allAds.length === 0 ? (
              <>
                <p className="text-sm font-medium text-zinc-500">No ads yet</p>
                <a href="/brands" className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2 transition-colors">
                  Add brands and scrape to get started →
                </a>
              </>
            ) : q ? (
              <>
                <p className="text-sm font-medium text-zinc-500">No ads match &ldquo;{q}&rdquo;</p>
                <button onClick={() => setSearch('')} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2 transition-colors">
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-500">No ads match these filters</p>
                <button onClick={() => { setFilters(DEFAULT_FILTERS); setSearch('') }} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2 transition-colors">
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sorted.map((ad) => (
              <AdCard key={ad.id} ad={ad} onAnalyze={handleAnalyze} onBookmark={handleBookmark} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
