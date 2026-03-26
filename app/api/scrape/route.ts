import { NextRequest, NextResponse } from 'next/server'
import { getAdsTable, getBrandsTable, ADS_FIELDS, BRANDS_FIELDS } from '@/lib/airtable'

function unixToIsoDate(ts?: number): string {
  if (!ts) return ''
  return new Date(ts * 1000).toISOString().split('T')[0]
}

const SCRAPECREATORS_API_KEY = process.env.SCRAPECREATORS_API_KEY!

type SnapCard = {
  original_image_url?: string
  resized_image_url?: string
  video_hd_url?: string
  video_sd_url?: string
  video_preview_image_url?: string
  title?: string
  body?: string
  cta_text?: string
}

type ScrapedAd = {
  ad_archive_id: string
  is_active: boolean
  page_name: string
  start_date?: number   // Unix timestamp from Meta Ad Library
  end_date?: number
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

// Extract Facebook page ID from a Meta Ad Library URL
// Handles: ?id=XXX, ?view_all_page_id=XXX, ?active_status=...&view_all_page_id=XXX
function extractPageId(adLibraryUrl: string): string | null {
  try {
    const url = new URL(adLibraryUrl)
    return (
      url.searchParams.get('id') ||
      url.searchParams.get('view_all_page_id') ||
      null
    )
  } catch {
    return null
  }
}

function normalizeMediaType(format?: string): 'image' | 'video' | 'carousel' {
  if (!format) return 'image'
  const f = format.toUpperCase()
  if (f.includes('VIDEO')) return 'video'
  if (f.includes('DPA') || f.includes('CAROUSEL')) return 'carousel'
  return 'image'
}

function extractMediaUrl(ad: ScrapedAd): { url: string; thumbnail: string; type: 'image' | 'video' | 'carousel' } {
  const snap = ad.snapshot
  const fmt = snap.display_format?.toUpperCase() || ''

  // Top-level video
  if (fmt.includes('VIDEO') && snap.videos?.[0]) {
    const v = snap.videos[0]
    return { url: v.video_hd_url || v.video_sd_url || '', thumbnail: '', type: 'video' }
  }

  // Top-level image
  if (snap.images?.[0]) {
    const img = snap.images[0]
    return { url: img.original_image_url || img.resized_image_url || '', thumbnail: '', type: 'image' }
  }

  // DCO / carousel: media inside cards[]
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

async function scrapeByPageId(pageId: string): Promise<ScrapedAd[]> {
  const params = new URLSearchParams({
    pageId,
    limit: '20',
    sort_data_by: 'REACH_ESTIMATE_DESC',
  })

  const res = await fetch(
    `https://api.scrapecreators.com/v1/facebook/adLibrary/company/ads?${params}`,
    { headers: { 'x-api-key': SCRAPECREATORS_API_KEY } }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ScrapeCreators error ${res.status}: ${text}`)
  }

  const data = await res.json()
  if (!data.success) throw new Error(data.message || 'ScrapeCreators returned error')
  return data.results || []
}

async function upsertAd(ad: ScrapedAd, brandName: string, rank: number) {
  const AdsTable = getAdsTable()
  const existing = await AdsTable.select({
    filterByFormula: `{ad_id} = '${ad.ad_archive_id}'`,
    maxRecords: 1,
  }).firstPage()

  const { url: mediaUrl, thumbnail: thumbnailUrl, type: mediaType } = extractMediaUrl(ad)

  // If ad already exists but has no media_url (or wrong jpg stored for video), patch it
  if (existing.length > 0) {
    const existingMediaUrl = (existing[0].get('media_url') as string) || ''
    const isWrongVideoUrl = mediaType === 'video' && existingMediaUrl.includes('.jpg')
    if ((!existingMediaUrl || isWrongVideoUrl) && mediaUrl) {
      await getAdsTable().update(existing[0].id, {
        [ADS_FIELDS.media_url]: mediaUrl,
        [ADS_FIELDS.media_type]: mediaType,
        [ADS_FIELDS.thumbnail_url]: thumbnailUrl,
      })
      return { status: 'patched', ad_id: ad.ad_archive_id }
    }
    return { status: 'skipped', ad_id: ad.ad_archive_id }
  }
  const headline = ad.snapshot.title || ''
  const bodyCopy = ad.snapshot.body?.text || ''
  const ctaText = ad.snapshot.cta_text || ''
  const adLibraryUrl = `https://www.facebook.com/ads/library/?id=${ad.ad_archive_id}`

  await AdsTable.create({
    [ADS_FIELDS.brand_name]: brandName,
    [ADS_FIELDS.ad_id]: ad.ad_archive_id,
    [ADS_FIELDS.headline]: headline,
    [ADS_FIELDS.body_copy]: bodyCopy,
    [ADS_FIELDS.cta_text]: ctaText,
    [ADS_FIELDS.media_type]: mediaType,
    [ADS_FIELDS.media_url]: mediaUrl,
    [ADS_FIELDS.thumbnail_url]: thumbnailUrl,
    [ADS_FIELDS.ad_library_url]: adLibraryUrl,
    [ADS_FIELDS.impressions_rank]: rank,
    [ADS_FIELDS.scraped_at]: new Date().toISOString().split('T')[0],
    ...(ad.start_date ? { [ADS_FIELDS.ad_start_date]: unixToIsoDate(ad.start_date) } : {}),
    [ADS_FIELDS.is_active]: ad.is_active ?? true,
    [ADS_FIELDS.bookmarked]: false,
    [ADS_FIELDS.ai_analyzed]: false,
  })

  return { status: 'created', ad_id: ad.ad_archive_id }
}

export async function POST(req: NextRequest) {
  try {
    const { brandId } = await req.json()
    if (!brandId) return NextResponse.json({ error: 'brandId required' }, { status: 400 })

    const BrandsTable = getBrandsTable()
    const brandRecord = await BrandsTable.find(brandId)
    const brandName = (brandRecord.get('name') as string) || ''
    const adLibraryUrl = (brandRecord.get('ad_library_url') as string) || ''

    if (!adLibraryUrl) {
      return NextResponse.json(
        { error: `Brand "${brandName}" has no ad_library_url set` },
        { status: 400 }
      )
    }

    const pageId = extractPageId(adLibraryUrl)
    if (!pageId) {
      return NextResponse.json(
        { error: `Could not extract page ID from URL: ${adLibraryUrl}. Make sure it contains ?id=XXXX or ?view_all_page_id=XXXX` },
        { status: 400 }
      )
    }

    let ads: ScrapedAd[]
    try {
      ads = await scrapeByPageId(pageId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown scrape error'
      return NextResponse.json({ error: message }, { status: 502 })
    }

    if (!ads.length) {
      return NextResponse.json(
        { error: 'ScrapeCreators returned no ads for this brand' },
        { status: 404 }
      )
    }

    const results = []
    for (let i = 0; i < ads.length; i++) {
      let result
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          result = await upsertAd(ads[i], brandName, i + 1)
          break
        } catch (err) {
          if (attempt === 3) result = { status: 'error', ad_id: ads[i].ad_archive_id, error: String(err) }
        }
      }
      results.push(result)
    }

    await BrandsTable.update(brandId, {
      [BRANDS_FIELDS.last_scraped]: new Date().toISOString().split('T')[0],
    })

    const created = results.filter((r) => r?.status === 'created').length
    const patched = results.filter((r) => r?.status === 'patched').length
    const skipped = results.filter((r) => r?.status === 'skipped').length
    const errors = results.filter((r) => r?.status === 'error').length

    return NextResponse.json({ brand: brandName, total: ads.length, created, patched, skipped, errors, results })
  } catch (err) {
    console.error('[scrape]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
