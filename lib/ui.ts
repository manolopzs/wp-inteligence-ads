// Shared UI utilities — used across AdCard, AdDetail, Analysis, etc.

const BRAND_COLORS = [
  '#60a5fa','#34d399','#fb923c','#f87171',
  '#fbbf24','#2dd4bf','#f472b6','#22d3ee',
  '#4ade80','#ff3838',
]

export function brandColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return BRAND_COLORS[Math.abs(h) % BRAND_COLORS.length]
}

export function scoreColor(score: number): string {
  if (score >= 8) return '#10b981'
  if (score >= 6) return '#f59e0b'
  if (score >= 4) return '#f97316'
  return '#71717a'
}

export function scoreBg(score: number): string {
  if (score >= 8) return 'rgba(16,185,129,0.12)'
  if (score >= 6) return 'rgba(245,158,11,0.12)'
  if (score >= 4) return 'rgba(249,115,22,0.12)'
  return 'rgba(113,113,122,0.12)'
}

export function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

export function formatDays(days: number): string {
  if (days >= 365) return `${Math.floor(days / 365)}y`
  if (days >= 30) return `${Math.floor(days / 30)}mo`
  return `${days}d`
}
