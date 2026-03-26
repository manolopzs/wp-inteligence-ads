'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Ad } from '@/lib/airtable'
import { brandColor, humanize, daysAgo } from '@/lib/ui'

// ─── helpers ──────────────────────────────────────────────────────────────────

function mode(arr: string[]): string {
  const f: Record<string, number> = {}
  for (const v of arr) if (v) f[v] = (f[v] || 0) + 1
  return Object.entries(f).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
}

function freq(arr: string[]): Record<string, number> {
  const f: Record<string, number> = {}
  for (const v of arr) if (v) f[v] = (f[v] || 0) + 1
  return f
}

function avg(nums: number[]) {
  const v = nums.filter(n => n > 0)
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0
}

// ─── brand data ───────────────────────────────────────────────────────────────

type BrandData = {
  name: string
  category: string
  color: string
  total: number
  analyzed: Ad[]
  // persistence
  longRunners: Ad[]       // 30+ days
  avgDaysRunning: number
  activeCount: number
  // creative mix
  formatDist: Record<string, number>
  hookDist: Record<string, number>
  angleDist: Record<string, number>
  offerDist: Record<string, number>
  // top signals
  dominantHook: string
  dominantAngle: string
  dominantOffer: string
  dominantFormat: string
  // rotation
  rotationSpeed: 'winner_found' | 'steady' | 'testing'
  // score
  avgScore: number
  topAds: Ad[]
}

function buildBrandData(name: string, ads: Ad[], category: string): BrandData {
  const analyzed = ads.filter(a => a.ai_analyzed)
  const withDates = ads.filter(a => a.ad_start_date)
  const daysList = withDates.map(a => daysAgo(a.ad_start_date))
  const avgDays = daysList.length ? avg(daysList) : 0
  const longRunners = withDates.filter(a => daysAgo(a.ad_start_date) >= 30)
  const activeCount = ads.filter(a => a.is_active).length

  const scores = analyzed.map(a => a.whitepaper_overlap_score || 0).filter(s => s > 0)
  const avgScore = scores.length ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0

  const formats = analyzed.map(a => a.format || a.media_type || '').filter(Boolean)
  const hooks = analyzed.map(a => a.hook_type || '').filter(Boolean)
  const angles = analyzed.map(a => a.copy_angle || '').filter(Boolean)
  const offers = analyzed.map(a => a.offer_type || '').filter(o => o && o !== 'none')

  // Rotation speed heuristic:
  // - Has 30d+ long-runner AND few total ads → found a winner, running it
  // - Many ads, short avg age → fast rotation / still testing
  // - In between → steady
  let rotationSpeed: BrandData['rotationSpeed'] = 'steady'
  if (longRunners.length >= 1 && ads.length <= 6) rotationSpeed = 'winner_found'
  else if (ads.length >= 8 && avgDays < 25) rotationSpeed = 'testing'

  const topAds = analyzed
    .sort((a, b) => {
      // Sort by longevity first (confirmed converters), then score
      const aLong = a.ad_start_date ? daysAgo(a.ad_start_date) : 0
      const bLong = b.ad_start_date ? daysAgo(b.ad_start_date) : 0
      const aScore = a.whitepaper_overlap_score || 0
      const bScore = b.whitepaper_overlap_score || 0
      return (bLong + bScore * 3) - (aLong + aScore * 3)
    })

  return {
    name, category, color: brandColor(name),
    total: ads.length, analyzed,
    longRunners, avgDaysRunning: avgDays, activeCount,
    formatDist: freq(formats),
    hookDist: freq(hooks),
    angleDist: freq(angles),
    offerDist: freq(offers),
    dominantHook: mode(hooks),
    dominantAngle: mode(angles),
    dominantOffer: mode(offers),
    dominantFormat: mode(formats),
    rotationSpeed,
    avgScore,
    topAds,
  }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function RotationBadge({ speed }: { speed: BrandData['rotationSpeed'] }) {
  const config = {
    winner_found: { label: 'Winner found', dot: '#10b981', bg: '#f0fdf4', text: '#15803d' },
    steady:       { label: 'Steady cadence', dot: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
    testing:      { label: 'Still testing', dot: '#f97316', bg: '#fff7ed', text: '#c2410c' },
  }[speed]
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full"
      style={{ background: config.bg, color: config.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {config.label}
    </span>
  )
}

function DistBar({ dist, total, limit = 4 }: { dist: Record<string, number>; total: number; limit?: number }) {
  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, limit)
  if (!entries.length) return null
  return (
    <div className="space-y-1.5">
      {entries.map(([key, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 w-28 shrink-0 truncate capitalize">
              {humanize(key)}
            </span>
            <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-400 dark:bg-zinc-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-mono text-zinc-400 w-8 text-right shrink-0">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

function AdRow({ ad }: { ad: Ad }) {
  const thumbSrc = ad.media_type === 'video' ? (ad.thumbnail_url || ad.media_url) : ad.media_url
  const score = ad.whitepaper_overlap_score || 0
  const days = ad.ad_start_date ? daysAgo(ad.ad_start_date) : null

  return (
    <Link href={`/ads/${ad.id}`} className="block group">
      <div className="flex gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
        <div className="w-16 h-12 shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative">
          {thumbSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbSrc} alt="" className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-zinc-400 text-[9px] font-mono uppercase">{ad.media_type}</span>
            </div>
          )}
          {ad.media_type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5 ml-0.5"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1 leading-tight">
              {ad.headline || <span className="italic text-zinc-400 font-normal">No headline</span>}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {days !== null && days >= 30 && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                  {days}d running
                </span>
              )}
              {score > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: score >= 8 ? '#10b98120' : score >= 6 ? '#f59e0b20' : '#f9731620',
                    color: score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#f97316',
                  }}>
                  {score}/10
                </span>
              )}
            </div>
          </div>

          {ad.ai_summary && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-snug">{ad.ai_summary}</p>
          )}

          <div className="flex flex-wrap gap-1">
            {[ad.hook_type, ad.copy_angle, ad.offer_type !== 'none' ? ad.offer_type : '', ad.format]
              .filter(Boolean)
              .map((tag, i) => (
                <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 capitalize">
                  {humanize(tag!)}
                </span>
              ))}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const [brands, setBrands] = useState<BrandData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set())
  const [expandedSection, setExpandedSection] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<'score' | 'volume' | 'longevity'>('longevity')

  useEffect(() => {
    async function load() {
      const [adsRes, brandsRes] = await Promise.all([
        fetch('/api/ads').then(r => r.json()),
        fetch('/api/brands').then(r => r.json()),
      ])

      const allAds: Ad[] = Array.isArray(adsRes) ? adsRes : []
      const brandList: { name: string; category: string }[] = Array.isArray(brandsRes) ? brandsRes : []
      const catMap: Record<string, string> = {}
      for (const b of brandList) catMap[b.name] = b.category

      const grouped: Record<string, Ad[]> = {}
      for (const ad of allAds) {
        if (!grouped[ad.brand_name]) grouped[ad.brand_name] = []
        grouped[ad.brand_name].push(ad)
      }

      const data = Object.entries(grouped).map(([name, ads]) =>
        buildBrandData(name, ads, catMap[name] || '')
      )

      setBrands(data)
      setLoading(false)
    }
    load()
  }, [])

  function toggleExpand(name: string) {
    setExpandedBrands(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function setSection(brand: string, section: string) {
    setExpandedSection(prev => ({ ...prev, [brand]: prev[brand] === section ? '' : section }))
  }

  const sorted = [...brands].sort((a, b) => {
    if (sort === 'score') return b.avgScore - a.avgScore
    if (sort === 'longevity') return b.longRunners.length - a.longRunners.length
    return b.analyzed.length - a.analyzed.length
  })

  const allAnalyzed = brands.flatMap(b => b.analyzed)

  // ── Gap analysis: find angles/hooks/formats used by <30% of brands ──────────
  const brandsWithData = brands.filter(b => b.analyzed.length > 0)
  const brandCount = brandsWithData.length

  function computeGaps(key: 'hookDist' | 'angleDist' | 'formatDist') {
    const usageByBrand: Record<string, number> = {}
    for (const b of brandsWithData) {
      for (const [val] of Object.entries(b[key])) {
        usageByBrand[val] = (usageByBrand[val] || 0) + 1
      }
    }
    return Object.entries(usageByBrand)
      .filter(([, count]) => count <= Math.max(1, Math.floor(brandCount * 0.3)))
      .sort((a, b) => a[1] - b[1])
      .slice(0, 5)
      .map(([val, count]) => ({ val, usedBy: count, pct: Math.round((count / brandCount) * 100) }))
  }

  const hookGaps = computeGaps('hookDist')
  const angleGaps = computeGaps('angleDist')
  const formatGaps = computeGaps('formatDist')

  // ── Top long-running ads across all brands ────────────────────────────────
  const battleTested = allAnalyzed
    .filter(a => a.ad_start_date && daysAgo(a.ad_start_date) >= 30 && a.ai_summary)
    .sort((a, b) => daysAgo(b.ad_start_date) - daysAgo(a.ad_start_date))
    .slice(0, 5)

  const totalLongRunners = allAnalyzed.filter(a => a.ad_start_date && daysAgo(a.ad_start_date) >= 30).length

  // ── What's working right now: top hook+angle combos from 30d+ ads ─────────
  const confirmedAds = allAnalyzed.filter(a => a.ad_start_date && daysAgo(a.ad_start_date) >= 30 && a.hook_type && a.copy_angle)
  const comboFreq: Record<string, number> = {}
  for (const ad of confirmedAds) {
    const key = `${ad.hook_type}\x1F${ad.copy_angle}`
    comboFreq[key] = (comboFreq[key] || 0) + 1
  }
  const topCombos = Object.entries(comboFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => {
      const [hook, angle] = key.split('\x1F')
      return { hook, angle, count }
    })

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800/80 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap max-w-6xl mx-auto">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Competitor Intelligence</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              {loading ? 'Loading...' : `${brandsWithData.length} brands · ${allAnalyzed.length} ads analyzed · ${totalLongRunners} confirmed converters (30d+)`}
            </p>
          </div>

          {!loading && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-zinc-400 mr-1">Sort</span>
              {([['longevity', 'Persistence'], ['score', 'Score'], ['volume', 'Volume']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setSort(val)}
                  className={`text-[11px] font-mono h-7 px-3 rounded-lg border transition-all ${
                    sort === val
                      ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-6 space-y-4 max-w-6xl mx-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="text-4xl">📊</div>
          <p className="text-sm font-medium text-zinc-500">No analyzed ads yet</p>
          <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2">
            Go to Dashboard and analyze some ads →
          </Link>
        </div>
      ) : (
        <div className="p-6 max-w-6xl mx-auto space-y-5">

          {/* ══ SECTION 0: WHAT'S WORKING RIGHT NOW ═══════════════════════════ */}
          {topCombos.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">What&apos;s Working Right Now</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5 ml-4">
                  Hook + angle combos most common across confirmed converters (30d+ ads) — the meta-playbook for this category
                </p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {topCombos.map(({ hook, angle, count }, i) => (
                  <div key={`${hook}-${angle}`} className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-zinc-400 w-4 shrink-0">{i + 1}</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 capitalize shrink-0">
                        {humanize(hook)}
                      </span>
                      <span className="text-[11px] text-zinc-400">+</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 capitalize shrink-0">
                        {humanize(angle)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400 dark:bg-blue-500 rounded-full"
                          style={{ width: `${Math.round((count / topCombos[0].count) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 w-12 text-right">
                        {count} ad{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ SECTION 1: BATTLE-TESTED ADS ══════════════════════════════════ */}
          {battleTested.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Confirmed Converters</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 ml-4">
                    Running 30+ days — if a brand is still paying for it, it converts
                  </p>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">{totalLongRunners} total</span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {battleTested.map(ad => (
                  <div key={ad.id} className="px-2">
                    <AdRow ad={ad} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ SECTION 2: CATEGORY GAP RADAR ═════════════════════════════════ */}
          {brandCount >= 2 && (hookGaps.length > 0 || angleGaps.length > 0) && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ff3838]" />
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Category Gaps</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5 ml-4">
                  Angles and formats used by fewer than 30% of competitors — whitespace you can own
                </p>
              </div>

              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
                {hookGaps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2">Hook gaps</p>
                    <div className="space-y-1.5">
                      {hookGaps.map(g => (
                        <div key={g.val} className="flex items-center justify-between">
                          <span className="text-[12px] text-zinc-700 dark:text-zinc-300 capitalize">{humanize(g.val)}</span>
                          <span className="text-[10px] font-mono text-zinc-400">{g.usedBy}/{brandCount} brands</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {angleGaps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2">Angle gaps</p>
                    <div className="space-y-1.5">
                      {angleGaps.map(g => (
                        <div key={g.val} className="flex items-center justify-between">
                          <span className="text-[12px] text-zinc-700 dark:text-zinc-300 capitalize">{humanize(g.val)}</span>
                          <span className="text-[10px] font-mono text-zinc-400">{g.usedBy}/{brandCount} brands</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {formatGaps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2">Format gaps</p>
                    <div className="space-y-1.5">
                      {formatGaps.map(g => (
                        <div key={g.val} className="flex items-center justify-between">
                          <span className="text-[12px] text-zinc-700 dark:text-zinc-300 capitalize">{humanize(g.val)}</span>
                          <span className="text-[10px] font-mono text-zinc-400">{g.usedBy}/{brandCount} brands</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ SECTION 3: BRAND INTELLIGENCE CARDS ══════════════════════════ */}
          {sorted.map(brand => {
            const isExpanded = expandedBrands.has(brand.name)
            const activeTab = expandedSection[brand.name] || ''
            const adsToShow = isExpanded ? brand.topAds : brand.topAds.slice(0, 2)
            const noData = brand.analyzed.length === 0
            const totalAnalyzed = brand.analyzed.length
            const hookEntries = Object.entries(brand.hookDist).sort((a, b) => b[1] - a[1])
            const angleEntries = Object.entries(brand.angleDist).sort((a, b) => b[1] - a[1])

            return (
              <div key={brand.name}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">

                {/* ── Brand header ── */}
                <div className="px-5 pt-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex items-start justify-between gap-4">

                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Name row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: brand.color }} />
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{brand.name}</span>
                        {brand.category && (
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded capitalize">
                            {humanize(brand.category)}
                          </span>
                        )}
                        <RotationBadge speed={brand.rotationSpeed} />
                      </div>

                      {/* Persistence row */}
                      {!noData && (
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-[11px] font-mono text-zinc-500">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{brand.total}</span> ads in library
                          </span>
                          {brand.longRunners.length > 0 && (
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {brand.longRunners.length} running 30d+
                            </span>
                          )}
                          {brand.avgDaysRunning > 0 && (
                            <span className="text-[11px] font-mono text-zinc-400">
                              avg {brand.avgDaysRunning}d running
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-zinc-400">
                            {brand.analyzed.length}/{brand.total} analyzed
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Score */}
                    {brand.avgScore > 0 && (
                      <div className="shrink-0 text-right">
                        <span className="text-2xl font-black font-mono tabular-nums"
                          style={{ color: brand.avgScore >= 8 ? '#10b981' : brand.avgScore >= 6 ? '#f59e0b' : '#f97316' }}>
                          {brand.avgScore}
                        </span>
                        <p className="text-[9px] font-mono text-zinc-400">avg score</p>
                      </div>
                    )}
                  </div>

                  {/* ── Deep dive tabs ── */}
                  {!noData && totalAnalyzed >= 2 && (
                    <div className="flex gap-1 mt-3">
                      {[
                        { id: 'hooks', label: 'Hooks' },
                        { id: 'angles', label: 'Angles' },
                        { id: 'formats', label: 'Formats' },
                        { id: 'offers', label: 'Offers' },
                      ].map(tab => (
                        <button key={tab.id}
                          onClick={() => setSection(brand.name, tab.id)}
                          className={`text-[10px] font-mono h-6 px-2.5 rounded-lg border transition-all ${
                            activeTab === tab.id
                              ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900'
                              : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300'
                          }`}>
                          {tab.label}
                        </button>
                      ))}
                      {activeTab && (
                        <button onClick={() => setSection(brand.name, '')}
                          className="text-[10px] font-mono h-6 px-2 text-zinc-400 hover:text-zinc-600 transition-colors ml-1">
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Distribution panel ── */}
                {activeTab && !noData && (
                  <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800/60">
                    <div className="max-w-sm">
                      {activeTab === 'hooks' && (
                        <>
                          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3">
                            Hook distribution — {hookEntries.length} types used
                          </p>
                          <DistBar dist={brand.hookDist} total={totalAnalyzed} />
                          {hookEntries.length >= 2 && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-3 leading-snug">
                              {hookEntries[0][1] / totalAnalyzed > 0.6
                                ? `Heavily concentrated on ${humanize(hookEntries[0][0])} — limited hook variety.`
                                : `Testing multiple hooks. No clear winner yet.`
                              }
                            </p>
                          )}
                        </>
                      )}
                      {activeTab === 'angles' && (
                        <>
                          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3">
                            Message angle distribution
                          </p>
                          <DistBar dist={brand.angleDist} total={totalAnalyzed} />
                          {angleEntries.length >= 2 && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-3 leading-snug">
                              {angleEntries[0][1] / totalAnalyzed > 0.5
                                ? `${humanize(angleEntries[0][0])} is their dominant angle — they've found traction here.`
                                : `Spread across angles — still discovering what resonates with their audience.`
                              }
                            </p>
                          )}
                        </>
                      )}
                      {activeTab === 'formats' && (
                        <>
                          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3">
                            Creative format mix
                          </p>
                          <DistBar dist={brand.formatDist} total={totalAnalyzed} />
                        </>
                      )}
                      {activeTab === 'offers' && (
                        <>
                          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-3">
                            Offer types used
                          </p>
                          {Object.keys(brand.offerDist).length > 0
                            ? <DistBar dist={brand.offerDist} total={totalAnalyzed} />
                            : <p className="text-[11px] font-mono text-zinc-400">No offer data yet</p>
                          }
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Ads list ── */}
                {noData ? (
                  <div className="px-5 py-4 text-center">
                    <p className="text-xs font-mono text-zinc-400">No analyzed ads yet —</p>
                    <Link href="/dashboard" className="text-xs font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2">
                      go to Dashboard to analyze →
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/40 px-2">
                      {adsToShow.map(ad => <AdRow key={ad.id} ad={ad} />)}
                    </div>

                    <div className="px-5 py-2.5 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60">
                      {brand.topAds.length > 2 && (
                        <button onClick={() => toggleExpand(brand.name)}
                          className="text-[11px] font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                          {isExpanded ? '▾ Show less' : `▸ ${brand.topAds.length - 2} more ads`}
                        </button>
                      )}
                      <Link href={`/?brand=${encodeURIComponent(brand.name)}`}
                        className="text-[11px] font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors ml-auto">
                        View all {brand.total} ads →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
