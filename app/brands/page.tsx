'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/Badge'

type Brand = {
  id: string
  name: string
  ad_library_url: string
  category: string
  last_scraped: string | null
  active: boolean
}

type ScrapeStatus = { [brandId: string]: 'idle' | 'scraping' | 'done' | 'error' | 'deleting' }
type ScrapeResult = { [brandId: string]: { created: number; patched?: number; skipped: number; error?: string } }

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ScrapeStatus>({})
  const [results, setResults] = useState<ScrapeResult>({})
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', ad_library_url: '', category: 'media' })
  const [adding, setAdding] = useState(false)
  const [scrapingAll, setScrapingAll] = useState(false)

  async function fetchBrands() {
    const res = await fetch('/api/brands')
    const data = await res.json()
    setBrands(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchBrands() }, [])

  async function scrapeBrand(brand: Brand) {
    setStatus((s) => ({ ...s, [brand.id]: 'scraping' }))
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: brand.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus((s) => ({ ...s, [brand.id]: 'error' }))
        setResults((r) => ({ ...r, [brand.id]: { created: 0, skipped: 0, error: data.error } }))
      } else {
        setStatus((s) => ({ ...s, [brand.id]: 'done' }))
        setResults((r) => ({ ...r, [brand.id]: { created: data.created, patched: data.patched, skipped: data.skipped } }))
      }
    } catch (err) {
      setStatus((s) => ({ ...s, [brand.id]: 'error' }))
      setResults((r) => ({ ...r, [brand.id]: { created: 0, skipped: 0, error: String(err) } }))
    }
  }

  async function handleScrapeAll() {
    setScrapingAll(true)
    const active = brands.filter(b => b.active)
    for (const brand of active) {
      await scrapeBrand(brand)
    }
    fetchBrands()
    setScrapingAll(false)
  }

  async function handleScrape(brand: Brand) {
    await scrapeBrand(brand)
    fetchBrands()
  }

  async function handleDelete(brand: Brand) {
    if (!confirm(`Delete "${brand.name}"? This cannot be undone.`)) return
    setStatus((s) => ({ ...s, [brand.id]: 'deleting' }))
    try {
      await fetch(`/api/brands/${brand.id}`, { method: 'DELETE' })
      setBrands((prev) => prev.filter((b) => b.id !== brand.id))
    } catch {
      setStatus((s) => ({ ...s, [brand.id]: 'error' }))
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setForm({ name: '', ad_library_url: '', category: 'media' })
        setShowAdd(false)
        fetchBrands()
      }
    } finally {
      setAdding(false)
    }
  }

  const activeCount = brands.filter(b => b.active).length
  const scrapingCount = Object.values(status).filter(s => s === 'scraping').length

  const inputClass = 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors'

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-5xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Brands</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-0.5">
              {loading ? 'Loading...' : `${brands.length} brands`}
              {!loading && activeCount < brands.length && (
                <span className="ml-2 text-zinc-400 dark:text-zinc-600">· {activeCount} active</span>
              )}
              {scrapingCount > 0 && (
                <span className="ml-2 text-blue-500 animate-pulse">· scraping {scrapingCount}...</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleScrapeAll}
              disabled={scrapingAll || loading || brands.length === 0}
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border border-zinc-900 dark:border-zinc-100 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-40"
            >
              {scrapingAll ? '⏳ Scraping...' : '↻ Scrape all'}
            </button>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="text-xs font-mono px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {showAdd ? '✕ Cancel' : '+ Add brand'}
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <form onSubmit={handleAdd} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="text-xs font-mono font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">New Brand</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                required
                placeholder="Brand name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
              <input
                placeholder="Meta Ad Library URL"
                value={form.ad_library_url}
                onChange={(e) => setForm((f) => ({ ...f, ad_library_url: e.target.value }))}
                className={inputClass}
              />
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={inputClass}
              >
                <option value="ecommerce">Ecommerce</option>
                <option value="media">Media / Subscription</option>
                <option value="saas">SaaS</option>
                <option value="b2b">B2B</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="text-xs font-mono px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add brand'}
            </button>
          </form>
        )}

        {/* Brands table */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left px-5 py-3 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Brand</th>
                  <th className="text-left px-5 py-3 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Last scraped</th>
                  <th className="text-left px-5 py-3 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Result</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {brands.map((brand) => {
                  const s = status[brand.id] || 'idle'
                  const r = results[brand.id]
                  return (
                    <tr key={brand.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200 font-medium">{brand.name}</div>
                        {brand.ad_library_url && (
                          <a
                            href={brand.ad_library_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 underline underline-offset-2 transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            ad library ↗
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge label={brand.category} />
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
                          {brand.last_scraped || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {s === 'scraping' && (
                          <span className="text-[10px] font-mono text-blue-500 dark:text-blue-400 animate-pulse">scraping...</span>
                        )}
                        {s === 'done' && r && (
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                            +{r.created} new{r.patched ? ` · ${r.patched} fixed` : ''} · {r.skipped} skipped
                          </span>
                        )}
                        {s === 'error' && r?.error && (
                          <span
                            className="text-[10px] font-mono text-red-500 cursor-help"
                            title={r.error}
                          >
                            ✗ error
                          </span>
                        )}
                        {s === 'idle' && (
                          <span className="text-[10px] font-mono text-zinc-300 dark:text-zinc-700">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleScrape(brand)}
                            disabled={s === 'scraping' || s === 'deleting' || scrapingAll}
                            className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all disabled:opacity-40"
                          >
                            {s === 'scraping' ? 'Scraping...' : 'Scrape'}
                          </button>
                          <button
                            onClick={() => handleDelete(brand)}
                            disabled={s === 'scraping' || s === 'deleting' || scrapingAll}
                            className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-40"
                          >
                            {s === 'deleting' ? '...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
