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

type BrandStatus = { [id: string]: 'idle' | 'scraping' | 'deleting' | 'error' }
type ScrapeResult = { [id: string]: { created: number; skipped: number; error?: string } }

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<BrandStatus>({})
  const [results, setResults] = useState<ScrapeResult>({})
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', ad_library_url: '', category: 'us_premium' })
  const [adding, setAdding] = useState(false)

  async function fetchBrands() {
    const res = await fetch('/api/brands')
    const data = await res.json()
    setBrands(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchBrands() }, [])

  async function handleScrape(brand: Brand) {
    setStatus(s => ({ ...s, [brand.id]: 'scraping' }))
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: brand.id }),
      })
      const data = await res.json()
      setStatus(s => ({ ...s, [brand.id]: res.ok ? 'idle' : 'error' }))
      setResults(r => ({ ...r, [brand.id]: { created: data.created ?? 0, skipped: data.skipped ?? 0, error: data.error } }))
    } catch (err) {
      setStatus(s => ({ ...s, [brand.id]: 'error' }))
      setResults(r => ({ ...r, [brand.id]: { created: 0, skipped: 0, error: String(err) } }))
    }
    fetchBrands()
  }

  async function handleDelete(brand: Brand) {
    if (!confirm(`Delete "${brand.name}" and all its ads? This cannot be undone.`)) return
    setStatus(s => ({ ...s, [brand.id]: 'deleting' }))
    const res = await fetch(`/api/brands/${brand.id}`, { method: 'DELETE' })
    if (res.ok) {
      setBrands(prev => prev.filter(b => b.id !== brand.id))
    } else {
      setStatus(s => ({ ...s, [brand.id]: 'error' }))
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
        setForm({ name: '', ad_library_url: '', category: 'us_premium' })
        setShowAdd(false)
        fetchBrands()
      }
    } finally {
      setAdding(false)
    }
  }

  const inputClass = 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors'

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Brands</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {loading ? 'Loading...' : `${brands.length} brands`}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs font-mono px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {showAdd ? '✕ Cancel' : '+ Add brand'}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <form onSubmit={handleAdd} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                required
                placeholder="Brand name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
              <input
                placeholder="Meta Ad Library URL"
                value={form.ad_library_url}
                onChange={e => setForm(f => ({ ...f, ad_library_url: e.target.value }))}
                className={inputClass}
              />
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className={inputClass}
              >
                <option value="us_premium">US Premium</option>
                <option value="global_premium">Global Premium</option>
                <option value="mexico">Mexico</option>
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
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : brands.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-mono text-zinc-400">No brands yet. Add one above.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left px-5 py-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Brand</th>
                  <th className="text-left px-5 py-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Last scraped</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {brands.map(brand => {
                  const s = status[brand.id] || 'idle'
                  const r = results[brand.id]
                  const busy = s === 'scraping' || s === 'deleting'
                  return (
                    <tr key={brand.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200 font-medium">{brand.name}</div>
                        {brand.ad_library_url && (
                          <a href={brand.ad_library_url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-400 underline underline-offset-2 transition-colors"
                            onClick={e => e.stopPropagation()}>
                            ad library ↗
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge label={brand.category} />
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span className="font-mono text-xs text-zinc-400">
                          {r?.error ? (
                            <span className="text-red-500" title={r.error}>✗ error</span>
                          ) : r ? (
                            <span className="text-emerald-600 dark:text-emerald-400">+{r.created} new · {r.skipped} skipped</span>
                          ) : (
                            brand.last_scraped || '—'
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleScrape(brand)}
                            disabled={busy}
                            className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all disabled:opacity-40"
                          >
                            {s === 'scraping' ? 'Scraping...' : 'Scrape'}
                          </button>
                          <button
                            onClick={() => handleDelete(brand)}
                            disabled={busy}
                            className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-40"
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
          )}
        </div>
      </div>
    </div>
  )
}
