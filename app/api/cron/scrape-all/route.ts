import { NextRequest, NextResponse } from 'next/server'
import { getBrandsTable, getAdsTable, ADS_FIELDS, BRANDS_FIELDS } from '@/lib/airtable'

const SCRAPECREATORS_API_KEY = process.env.SCRAPECREATORS_API_KEY!

type SnapCard = {
  original_image_url?: string
  resized_image_url?: string
  video_hd_url?: string
  video_sd_url?: string
  video_preview_image_url?: string
}

type ScrapedAd = {
  ad_archive_id: string
  is_active: boolean
  snapshot: {
    title?: string
    body?: { text?: string }
    cta_text?: string
    display_format?: string
    images?: { original_image_url?: string; resized_image_url?: string }[]
    videos?: { video_hd_url?: string; video_sd_url?: string }[]
    cards?: SnapCard[]
  }
}

function extractPageId(url: string): string | null {
  try {
    const u = new URL(url)
    return u.searchParams.get('id') || u.searchParams.get('view_all_page_id') || null
  } catch { return null }
}

function extractMedia(snap: ScrapedAd['snapshot']): { url: string; thumbnail: string; type: 'image' | 'video' | 'carousel' } {
  const fmt = snap.display_format?.toUpperCase() || ''

  if (fmt.includes('VIDEO') && snap.videos?.[0]) {
    const v = snap.videos[0]
    return { url: v.video_hd_url || v.video_sd_url || '', thumbnail: '', type: 'video' }
  }

  if (snap.images?.[0]) {
    const img = snap.images[0]
    return { url: img.original_image_url || img.resized_image_url || '', thumbnail: '', type: 'image' }
  }

  if (snap.cards?.length) {
    const card = snap.cards[0]
    if (card.video_hd_url || card.video_sd_url) {
      return {
        url: card.video_hd_url || card.video_sd_url || '',
        thumbnail: card.video_preview_image_url || '',
        type: 'video',
      }
    }
    return { url: card.original_image_url || card.resized_image_url || '', thumbnail: '', type: 'image' }
  }

  const type = fmt.includes('DPA') || fmt.includes('CAROUSEL') ? 'carousel' : 'image'
  return { url: '', thumbnail: '', type }
}

async function scrapeAdLibrary(adLibraryUrl: string): Promise<ScrapedAd[]> {
  const pageId = extractPageId(adLibraryUrl)
  if (!pageId) throw new Error(`No page ID in URL: ${adLibraryUrl}`)
  const params = new URLSearchParams({ pageId, limit: '20', sort_data_by: 'REACH_ESTIMATE_DESC' })
  const res = await fetch(`https://api.scrapecreators.com/v1/facebook/adLibrary/company/ads?${params}`, {
    headers: { 'x-api-key': SCRAPECREATORS_API_KEY },
  })
  if (!res.ok) throw new Error(`ScrapeCreators ${res.status}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.message || 'ScrapeCreators error')
  return data.results || []
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const BrandsTable = getBrandsTable()
  const AdsTable = getAdsTable()
  const brandRecords = await BrandsTable.select({ filterByFormula: '{active} = TRUE()' }).all()
  const log: Record<string, { new: number; skipped: number; error?: string }> = {}

  for (const brand of brandRecords) {
    const brandName = (brand.get('name') as string) || ''
    const adLibraryUrl = (brand.get('ad_library_url') as string) || ''

    if (!adLibraryUrl) { log[brandName] = { new: 0, skipped: 0, error: 'No ad_library_url' }; continue }

    let ads: ScrapedAd[]
    try {
      ads = await scrapeAdLibrary(adLibraryUrl)
    } catch (err) {
      log[brandName] = { new: 0, skipped: 0, error: String(err) }
      continue
    }

    let newCount = 0, skippedCount = 0

    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i]
      const existing = await AdsTable.select({
        filterByFormula: `{ad_id} = '${ad.ad_archive_id}'`,
        maxRecords: 1,
      }).firstPage()
      if (existing.length > 0) { skippedCount++; continue }

      const { url: mediaUrl, thumbnail: thumbnailUrl, type: mediaType } = extractMedia(ad.snapshot)

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await AdsTable.create({
            [ADS_FIELDS.brand_name]: brandName,
            [ADS_FIELDS.ad_id]: ad.ad_archive_id,
            [ADS_FIELDS.headline]: ad.snapshot.title || '',
            [ADS_FIELDS.body_copy]: ad.snapshot.body?.text || '',
            [ADS_FIELDS.cta_text]: ad.snapshot.cta_text || '',
            [ADS_FIELDS.media_type]: mediaType,
            [ADS_FIELDS.media_url]: mediaUrl,
            [ADS_FIELDS.thumbnail_url]: thumbnailUrl,
            [ADS_FIELDS.ad_library_url]: `https://www.facebook.com/ads/library/?id=${ad.ad_archive_id}`,
            [ADS_FIELDS.impressions_rank]: i + 1,
            [ADS_FIELDS.scraped_at]: new Date().toISOString().split('T')[0],
            [ADS_FIELDS.is_active]: ad.is_active ?? true,
            [ADS_FIELDS.bookmarked]: false,
            [ADS_FIELDS.ai_analyzed]: false,
          })
          newCount++
          break
        } catch (err) {
          if (attempt === 3) console.error(`[cron] Failed to create ad ${ad.ad_archive_id}:`, err)
        }
      }
    }

    await BrandsTable.update(brand.id, {
      [BRANDS_FIELDS.last_scraped]: new Date().toISOString().split('T')[0],
    })
    log[brandName] = { new: newCount, skipped: skippedCount }
  }

  console.log('[cron/scrape-all]', JSON.stringify(log, null, 2))
  return NextResponse.json({ success: true, log })
}
