'use client'

import { useState } from 'react'
import { humanize } from '@/lib/ui'

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

type Props = {
  filters: Filters
  onChange: (f: Filters) => void
  brandNames: string[]
  search: string
  onSearchChange: (s: string) => void
}

const CATEGORIES   = ['us_premium', 'global_premium', 'mexico']
const MEDIA_TYPES  = ['image', 'video', 'carousel']
const HOOK_TYPES   = ['fomo', 'exclusivity', 'urgency', 'social_proof', 'benefit', 'curiosity']
const COPY_ANGLES  = ['matter_of_fact', 'aspirational', 'fear_of_missing_out', 'insider_access', 'time_saving', 'status']
const OFFER_TYPES  = ['free_trial', 'discount', 'limited_time', 'direct_subscribe', 'lead_magnet', 'none']
const SORT_OPTIONS = [
  { value: 'impressions_rank',         label: 'Impressions' },
  { value: 'longevity',                label: 'Longevity' },
  { value: 'scraped_at',               label: 'Recent' },
  { value: 'whitepaper_overlap_score', label: 'Score' },
]
const BRANDS_COLLAPSED = 8

const base   = 'h-8 border text-[11px] font-mono rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer transition-colors'
const idle   = 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
const active = 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={`${base} ${value ? active : idle}`}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{humanize(o)}</option>)}
    </select>
  )
}

export function FilterBar({ filters, onChange, brandNames, search, onSearchChange }: Props) {
  const [expanded, setExpanded] = useState(false)

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value })
  }

  function toggleBrand(name: string) {
    set('brands', filters.brands.includes(name)
      ? filters.brands.filter(b => b !== name)
      : [...filters.brands, name])
  }

  const activeCount = [
    filters.brands.length > 0, !!filters.category, !!filters.media_type,
    !!filters.hook_type, !!filters.copy_angle, !!filters.offer_type,
    filters.bookmarked, filters.new_only,
  ].filter(Boolean).length

  const visibleBrands = expanded ? brandNames : brandNames.slice(0, BRANDS_COLLAPSED)

  return (
    <div className="sticky top-14 z-40 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm">

      <div className="px-6 py-2.5 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text" value={search} onChange={e => onSearchChange(e.target.value)}
            placeholder="Search ads..."
            className={`h-8 pl-8 pr-3 border text-[11px] font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-colors w-44 ${
              search ? `${active} placeholder:text-zinc-500` : `${idle} placeholder:text-zinc-400 dark:placeholder:text-zinc-600`
            }`}
          />
          {search && (
            <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
              <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>

        <Select value={filters.category}   onChange={v => set('category', v)}   options={CATEGORIES}  placeholder="Category" />
        <Select value={filters.media_type} onChange={v => set('media_type', v)} options={MEDIA_TYPES}  placeholder="Media" />
        <Select value={filters.hook_type}  onChange={v => set('hook_type', v)}  options={HOOK_TYPES}   placeholder="Hook" />
        <Select value={filters.copy_angle} onChange={v => set('copy_angle', v)} options={COPY_ANGLES}  placeholder="Angle" />
        <Select value={filters.offer_type} onChange={v => set('offer_type', v)} options={OFFER_TYPES}  placeholder="Offer" />

        <label className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border cursor-pointer transition-colors ${
          filters.bookmarked ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-700 dark:text-yellow-300' : `${idle} text-zinc-500`
        }`}>
          <input type="checkbox" checked={filters.bookmarked} onChange={e => set('bookmarked', e.target.checked)} className="sr-only" />
          <span className="text-[11px] font-mono">{filters.bookmarked ? '★' : '☆'} Saved</span>
        </label>

        <label className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border cursor-pointer transition-colors ${
          filters.new_only ? 'bg-blue-400/20 border-blue-400/50 text-blue-700 dark:text-blue-300' : `${idle} text-zinc-500`
        }`}>
          <input type="checkbox" checked={filters.new_only} onChange={e => set('new_only', e.target.checked)} className="sr-only" />
          <span className="text-[11px] font-mono">● New</span>
        </label>

        {activeCount > 0 && (
          <button
            onClick={() => onChange({ ...filters, brands: [], category: '', media_type: '', hook_type: '', copy_angle: '', offer_type: '', bookmarked: false, new_only: false })}
            className="flex items-center gap-1 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300 transition-colors"
          >
            ✕ Clear{activeCount > 1 ? ` (${activeCount})` : ''}
          </button>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-600 mr-0.5">Sort</span>
          {SORT_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => set('sort', opt.value)}
              className={`text-[11px] font-mono h-8 px-3 rounded-lg border transition-all ${
                filters.sort === opt.value
                  ? `${active} font-semibold`
                  : 'bg-transparent border-zinc-200 dark:border-zinc-700/80 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {brandNames.length > 0 && (
        <div className="px-6 pb-2.5 flex flex-wrap items-center gap-1.5">
          {visibleBrands.map(name => (
            <button key={name} onClick={() => toggleBrand(name)}
              className={`text-[10px] font-mono h-6 px-2.5 rounded-full border transition-all ${
                filters.brands.includes(name)
                  ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 font-semibold'
                  : 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}>
              {name}
            </button>
          ))}
          {brandNames.length > BRANDS_COLLAPSED && (
            <button onClick={() => setExpanded(e => !e)}
              className="text-[10px] font-mono h-6 px-2.5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 transition-all">
              {expanded ? '− less' : `+${brandNames.length - BRANDS_COLLAPSED} more`}
            </button>
          )}
          {filters.brands.length > 0 && (
            <button onClick={() => set('brands', [])} className="text-[10px] font-mono text-zinc-400 hover:text-zinc-600 transition-colors ml-1">
              clear brands
            </button>
          )}
        </div>
      )}
    </div>
  )
}
