import Airtable from 'airtable'

// Lazy table accessors — do not initialize at module load time (breaks build)
function table(name: 'Brands' | 'Ads' | 'Users') {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!apiKey) throw new Error('AIRTABLE_API_KEY is not set')
  if (!baseId) throw new Error('AIRTABLE_BASE_ID is not set')
  return new Airtable({ apiKey }).base(baseId)(name)
}

export const getBrandsTable = () => table('Brands')
export const getAdsTable = () => table('Ads')
export const getUsersTable = () => table('Users')

// Field IDs — used ONLY in create() and update() calls
export const BRANDS_FIELDS = {
  name: 'fldEhU29dvj3yG8pj',
  ad_library_url: 'fldQUQvg6dqpkQmzS',
  category: 'fldM1PmDKshHeR613',
  last_scraped: 'fldmKa5m66NztcqF5',
  active: 'fldHlW6izWTIIrBNj',
} as const

export const ADS_FIELDS = {
  brand_name: 'fld6M9az0ObtoiEOY',
  ad_id: 'fld2FiZ9Uqv524f0v',
  headline: 'fldbQXxd2ZI0S2bsw',
  body_copy: 'flde86HdDIbsVAXcR',
  cta_text: 'fldD4JW9RhBqSr3Uy',
  media_type: 'fldRK31ANnqqoTPZp',
  media_url: 'fldCiBfpIGAlPUpVK',
  thumbnail_url: 'fldGzt9OprECFFGzb',
  ad_library_url: 'fldSmPTWc5ro1EIIp',
  impressions_rank: 'fldsZ6tWc2r6NoIuX',
  scraped_at: 'fldis0K3kN1bZJbhV',
  ad_start_date: 'fldT8t2Qw58mlwbEb',
  is_active: 'fldICTrIcBZ4KsXhF',
  bookmarked: 'fldomKo42oxHoQ4dN',
  ai_analyzed: 'fldjA6A4xhxvDdmLE',
  hook_type: 'fldfyk98D23fQvGz6',
  copy_angle: 'fldkZLD8vAkpG2A9E',
  format: 'fldMj2h4kdRLy1VsF',
  offer_type: 'fldjQOi4XSbH0AHHB',
  cta_type: 'fldJ1PfLt9rWAMuK8',
  whitepaper_overlap_score: 'fldcZlIXJKeawhxBL',
  ai_summary: 'fldY7fNELFUg1HDuH',
  ai_raw_response: 'fldaevccRhx9fcarQ',
} as const

export const USERS_FIELDS = {
  email: 'fld94dBy6ddwatYCO',
  password_hash: 'fldgdVRBzL7e6DwBg',
  created_at: 'fld8nkTt1C79KO3Hu',
  active: 'fldt5tGAsfkAk2bmb',
} as const

export type Brand = {
  id: string
  name: string
  ad_library_url: string
  category: 'us_premium' | 'global_premium' | 'mexico'
  last_scraped: string | null
  active: boolean
}

export type Ad = {
  id: string
  brand_name: string
  ad_id: string
  headline: string
  body_copy: string
  cta_text: string
  media_type: 'image' | 'video' | 'carousel'
  media_url: string
  thumbnail_url: string
  ad_library_url: string
  impressions_rank: number
  scraped_at: string
  ad_start_date: string
  is_active: boolean
  bookmarked: boolean
  ai_analyzed: boolean
  hook_type: string
  copy_angle: string
  format: string
  offer_type: string
  cta_type: string
  whitepaper_overlap_score: number
  ai_summary: string
  ai_raw_response: string
}

export async function getBrands(): Promise<Brand[]> {
  const records = await getBrandsTable().select({
    filterByFormula: '{active} = TRUE()',
    sort: [{ field: 'name', direction: 'asc' }],
  }).all()

  return records.map((r) => ({
    id: r.id,
    name: (r.get('name') as string) || '',
    ad_library_url: (r.get('ad_library_url') as string) || '',
    category: (r.get('category') as Brand['category']) || 'us_premium',
    last_scraped: (r.get('last_scraped') as string) || null,
    active: (r.get('active') as boolean) || false,
  }))
}

export async function getAds(filters?: {
  brand?: string[]
  category?: string[]
  media_type?: string
  hook_type?: string
  copy_angle?: string
  offer_type?: string
  bookmarked?: boolean
}): Promise<Ad[]> {
  const formulas: string[] = []

  if (filters?.brand?.length) {
    const brandFormulas = filters.brand.map((b) => `{brand_name} = '${b}'`)
    formulas.push(`OR(${brandFormulas.join(',')})`)
  }
  if (filters?.media_type) formulas.push(`{media_type} = '${filters.media_type}'`)
  if (filters?.hook_type) formulas.push(`{hook_type} = '${filters.hook_type}'`)
  if (filters?.copy_angle) formulas.push(`{copy_angle} = '${filters.copy_angle}'`)
  if (filters?.offer_type) formulas.push(`{offer_type} = '${filters.offer_type}'`)
  if (filters?.bookmarked) formulas.push(`{bookmarked} = TRUE()`)

  const filterByFormula =
    formulas.length === 0 ? '' : formulas.length === 1 ? formulas[0] : `AND(${formulas.join(',')})`

  const records = await getAdsTable().select({
    ...(filterByFormula ? { filterByFormula } : {}),
    sort: [{ field: 'impressions_rank', direction: 'asc' }],
  }).all()

  return records.map(mapAdRecord)
}

export async function getAdById(id: string): Promise<Ad | null> {
  try {
    const record = await getAdsTable().find(id)
    return mapAdRecord(record)
  } catch {
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAdRecord(r: any): Ad {
  return {
    id: r.id,
    brand_name: (r.get('brand_name') as string) || '',
    ad_id: (r.get('ad_id') as string) || '',
    headline: (r.get('headline') as string) || '',
    body_copy: (r.get('body_copy') as string) || '',
    cta_text: (r.get('cta_text') as string) || '',
    media_type: (r.get('media_type') as Ad['media_type']) || 'image',
    media_url: (r.get('media_url') as string) || '',
    thumbnail_url: (r.get('thumbnail_url') as string) || '',
    ad_library_url: (r.get('ad_library_url') as string) || '',
    impressions_rank: (r.get('impressions_rank') as number) || 0,
    scraped_at: (r.get('scraped_at') as string) || '',
    ad_start_date: (r.get('ad_start_date') as string) || '',
    is_active: (r.get('is_active') as boolean) || false,
    bookmarked: (r.get('bookmarked') as boolean) || false,
    ai_analyzed: (r.get('ai_analyzed') as boolean) || false,
    hook_type: (r.get('hook_type') as string) || '',
    copy_angle: (r.get('copy_angle') as string) || '',
    format: (r.get('format') as string) || '',
    offer_type: (r.get('offer_type') as string) || '',
    cta_type: (r.get('cta_type') as string) || '',
    whitepaper_overlap_score: (r.get('whitepaper_overlap_score') as number) || 0,
    ai_summary: (r.get('ai_summary') as string) || '',
    ai_raw_response: (r.get('ai_raw_response') as string) || '',
  }
}
