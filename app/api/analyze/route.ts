import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAdsTable, getBrandsTable, ADS_FIELDS, BRANDS_FIELDS } from '@/lib/airtable'
import { analyzeVideoWithTwelveLabs } from '@/lib/twelvelabs'

const SYSTEM_PROMPT = `You are a senior Meta ads performance analyst specializing in subscription media brands. You give cold, evidence-based verdicts. You do not flatter ads. You call things as they are.

━━━ LONGEVITY: YOUR STRONGEST SIGNAL ━━━

The single most reliable indicator of a working Meta ad is how long it has been running. A brand only keeps paying for an ad if it is making money. Use this scale:

- 0–13 days → "Cannot evaluate yet." Meta's own learning phase is 7 days minimum. No conclusion is valid this early. Say so.
- 14–29 days → "Too early to call." Directional read only. Some signal but highly noisy.
- 30–59 days → "Possibly working." Passed initial testing but not confirmed. Treat with caution.
- 60–89 days → "Likely working." Brand has validated it enough to keep spending. Solid signal.
- 90–179 days → "Confirmed working." Three months of spend is a meaningful commitment. This ad is profitable.
- 180+ days → "Definitive winner." A brand does not run an ad for half a year without clear ROI. This is an evergreen performer.

Never call an ad "working" below 60 days unless the copy and creative signals are exceptionally strong. Never give a score above 7 to an ad running under 30 days.

━━━ COPY & CREATIVE SIGNALS ━━━

STRONG signals (ad is well-built):
- Hook names a specific problem, outcome, or audience — not a vague question or generic claim
- First line states the value proposition clearly — reader knows immediately what they get
- Offer fits a cold audience (free trial, free content, lead magnet) — not "subscribe now" to strangers
- Copy is specific: includes numbers, named outcomes, or a concrete story
- CTA matches the funnel stage — low friction for cold, direct for warm
- Headline and body add new information — they do not repeat each other
- For media/subscription: ad feels like editorial content, not an advertisement

WEAK signals (ad is poorly built):
- Hook is a cliché: "You won't believe…", "Are you tired of…", "Change your life…", generic questions
- Value proposition is vague or buried — reader cannot tell what they get in first two seconds
- Direct subscribe CTA on cold audience — wrong funnel stage for subscription media
- Headline and body repeat the same message without adding value
- Copy is generic — could be from any brand in the category
- Offer is hard to understand or requires too many steps
- No specificity: no numbers, no named outcomes, no concrete hook

━━━ SCORING RUBRIC — BE STRICT ━━━

1–2: Junk. Generic, unspecific, wrong funnel stage. No value in studying this.
3–4: Weak. One element works but core message is unclear or forgettable. Not worth adapting.
5–6: Average. Competent but not sharp. May be generating results through spend, not quality.
7: Good. Solid execution — clear hook, reasonable offer, specific copy. Worth noting.
8: Strong. Tight copy, right offer for the audience, specific hook. High probability of converting.
9: Excellent. Everything works together — hook, copy, offer, CTA, creative. Rare.
10: Exceptional. Unusually precise and creative. Reserved for ads that will be remembered.

The average ad is a 4–5. An ad needs to genuinely earn 7 or above. If longevity does not support a high score, cap it accordingly. Do not give 8+ to ads under 60 days regardless of copy quality.

━━━ OUTPUT FORMAT ━━━

Return ONLY a valid JSON object. No markdown. No explanation. No backticks.

{
  "hook_type": "fomo | exclusivity | urgency | social_proof | benefit | curiosity",
  "copy_angle": "matter_of_fact | aspirational | fear_of_missing_out | insider_access | time_saving | status",
  "format": "static_image | video_testimonial | ugc | carousel_headlines | stat_callout | talking_head",
  "offer_type": "free_trial | discount | limited_time | direct_subscribe | lead_magnet | none",
  "cta_type": "subscribe | free_trial | read_more | discover | access_now | other",
  "whitepaper_overlap_score": <integer 1–10, strictly following the rubric above>,
  "ai_summary": "<REQUIRED FORMAT: Start with one of these exact phrases based on days running and evidence: 'Definitive winner.' / 'Confirmed working.' / 'Likely working.' / 'Too early to call.' / 'Cannot evaluate yet.' / 'Likely weak.' / 'Weak.' Then write exactly 2 sentences: (1) cite the specific evidence — name the days running and the one strongest or weakest copy/creative element you observed, (2) name one concrete thing the brand can take away or avoid. Do not use vague language. Be specific and direct.>"
}`

function getBrandTypeContext(brandType: string): string {
  switch (brandType) {
    case 'ecommerce':
      return `
━━━ BRAND TYPE: ECOMMERCE ━━━
This is a product-based ecommerce brand. Evaluate using ecommerce-specific standards:

WHAT WORKS for ecommerce:
- Direct response CTA ("Shop now", "Get yours", "Buy today") is appropriate even for cold audiences — ecommerce has a shorter purchase cycle
- Strong product visual is critical — if the image does not show the product clearly, that is a weakness
- Before/after format, UGC testimonials, and unboxing styles convert well
- Discount or limited-time offers are strong positive signals for cold audiences
- Specific outcome hooks: "Lost 12kg in 60 days", "Made $4,000 from one photo" — numbers matter
- Social proof: reviews, ratings, user counts, influencer mentions
- Longevity threshold: 60+ days is confirmed working (ecommerce has faster feedback loops than subscription)

WHAT IS WEAK for ecommerce:
- No product shown or product is not the hero of the creative
- Generic lifestyle imagery with no product connection
- Vague benefit claims without specifics ("feel better", "look amazing")
- Lead magnet / content-first offer — wrong for direct purchase intent
- Long-form copy without a clear product hook in the first line`

    case 'saas':
      return `
━━━ BRAND TYPE: SAAS ━━━
This is a software / SaaS product. Evaluate using SaaS-specific standards:

WHAT WORKS for SaaS:
- Free trial or freemium offer — this is the right cold audience offer, not "buy now"
- Problem-first hook that names a specific pain point the ICP recognizes
- Feature-benefit framing: name the specific feature and the outcome it produces
- Social proof: user counts ("100,000+ teams use X"), G2/Capterra ratings, named customer logos
- Screen recordings or product UI shown — lets the prospect visualize themselves using it
- Comparison hooks: "Still using [competitor]? Here's why teams switch to X"
- Specificity: "Save 3 hours per week on X" beats "save time"

WHAT IS WEAK for SaaS:
- "Subscribe now" or purchase CTA to cold audiences — SaaS needs trial first
- No product shown — abstract brand imagery without showing what the software does
- Generic "we make your work easier" copy — not specific to a pain point
- No offer or vague offer ("learn more")
- Pricing mentioned in a cold ad — creates friction before value is established`

    case 'b2b':
      return `
━━━ BRAND TYPE: B2B ━━━
This is a B2B service or product with a longer sales cycle. Evaluate using B2B-specific standards:

WHAT WORKS for B2B:
- Lead magnet or free resource offer (guide, report, audit, assessment) — right cold offer
- Case study or results-led hook: "How [Company Type] achieved [Specific Result]"
- Data-led hooks: industry statistics or benchmark claims that make the reader feel behind
- Authority signals: named clients, years in business, specific credentials
- Specificity about the ICP: name the exact job title, company size, or problem
- Longer body copy is acceptable — B2B buyers read more before deciding
- Longevity of 90+ days is the real confirmed signal (B2B sales cycles are longer)

WHAT IS WEAK for B2B:
- "Sign up now" or direct purchase CTA to cold audiences — B2B needs nurture first
- Generic ROI claims without proof ("10x your revenue")
- No clear ICP — who exactly is this for?
- Product feature focus without business outcome connection
- No trust signals — B2B buyers need to feel safe before engaging`

    case 'media':
    default:
      return `
━━━ BRAND TYPE: MEDIA / SUBSCRIPTION ━━━
This is a subscription media, newsletter, or content brand. Evaluate using media-specific standards:

WHAT WORKS for media/subscription:
- Content-first creative: the ad feels like editorial content, not an advertisement
- Free trial or lead magnet offer for cold audiences — "subscribe now" is wrong funnel stage for cold
- Hook that demonstrates editorial value: a surprising data point, a counterintuitive claim, an exclusive insight
- Specificity about the audience: "For CMOs who run paid media" beats "For marketers"
- Social proof: subscriber counts, named publications where coverage appeared, specific reader outcomes
- The promise of access to information the reader cannot get elsewhere — exclusivity angle

WHAT IS WEAK for media/subscription:
- "Subscribe now" CTA to cold audiences — they have no relationship with the brand yet
- Generic "stay informed" or "be ahead of the curve" claims — not specific enough
- No demonstration of editorial value — reader cannot tell what they would actually get
- Vague audience definition — reads like it is for everyone, which means no one
- No social proof or credibility signal`
  }
}

const VALID = {
  hook_type: ['fomo','exclusivity','urgency','social_proof','benefit','curiosity'],
  copy_angle: ['matter_of_fact','aspirational','fear_of_missing_out','insider_access','time_saving','status'],
  format: ['static_image','video_testimonial','ugc','carousel_headlines','stat_callout','talking_head'],
  offer_type: ['free_trial','discount','limited_time','direct_subscribe','lead_magnet','none'],
  cta_type: ['subscribe','free_trial','read_more','discover','access_now','other'],
}
function sanitize(val: string, allowed: string[], fallback: string): string {
  const v = (val || '').toLowerCase().trim()
  return allowed.includes(v) ? v : fallback
}
function safeParseJSON(raw: string) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned)
}
function detectImageType(buffer: ArrayBuffer): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const bytes = new Uint8Array(buffer.slice(0, 12))
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  return 'image/jpeg'
}

type AnalysisResult = {
  hook_type: string
  copy_angle: string
  format: string
  offer_type: string
  cta_type: string
  whitepaper_overlap_score: number
  ai_summary: string
}

export async function POST(req: NextRequest) {
  try {
    const { adId } = await req.json()
    if (!adId) return NextResponse.json({ error: 'adId required' }, { status: 400 })

    const AdsTable = getAdsTable()
    const adRecord = await AdsTable.find(adId)
    const headline = (adRecord.get('headline') as string) || ''
    const body_copy = (adRecord.get('body_copy') as string) || ''
    const cta_text = (adRecord.get('cta_text') as string) || ''
    const media_type = (adRecord.get('media_type') as string) || ''
    const media_url = (adRecord.get('media_url') as string) || ''
    const thumbnail_url = (adRecord.get('thumbnail_url') as string) || ''
    const brand_name = (adRecord.get('brand_name') as string) || ''
    const ad_start_date = (adRecord.get('ad_start_date') as string) || ''
    const impressions_rank = (adRecord.get('impressions_rank') as number) || 0

    const daysRunning = ad_start_date
      ? Math.floor((Date.now() - new Date(ad_start_date).getTime()) / (1000 * 60 * 60 * 24))
      : null

    let category = ''
    try {
      const brands = await getBrandsTable()
        .select({ filterByFormula: `{name} = '${brand_name}'`, maxRecords: 1 })
        .firstPage()
      if (brands.length) {
        category = (brands[0].get('category') as string) || ''
      }
    } catch {}

    const brandTypeContext = getBrandTypeContext(category)

    const userMessage = `Brand: ${brand_name}
Category: ${category}
Brand type: ${category}
Days running: ${daysRunning !== null ? `${daysRunning} days` : 'unknown'}
Impressions rank: ${impressions_rank || 'unknown'} (lower = higher reach)

Headline: ${headline || '(none)'}
Body copy: ${body_copy || '(none)'}
CTA: ${cta_text || '(none)'}
Media type: ${media_type || 'unknown'}

Evaluate this ad honestly. Use days_running as your strongest signal — if it has been running 30+ days the brand is still paying for it, which means it is likely performing. If it has been running fewer than 14 days, you cannot conclude it is working yet.`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]

    if (media_type === 'video' && media_url) {
      // Use TwelveLabs Pegasus for true video understanding
      try {
        const videoDescription = await analyzeVideoWithTwelveLabs(media_url)
        if (videoDescription) {
          const enriched = `${userMessage}\n\nVideo content (analyzed by AI): ${videoDescription}`
          messages[0] = { role: 'user', content: enriched }
        } else if (thumbnail_url) {
          // Fallback: use thumbnail if TwelveLabs fails or times out
          const imgRes = await fetch(thumbnail_url, { headers: { Referer: 'https://www.facebook.com/' } })
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer()
            const base64 = Buffer.from(buffer).toString('base64')
            const safeType = detectImageType(buffer)
            messages[0] = { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: safeType, data: base64 } }, { type: 'text', text: userMessage }] }
          }
        }
      } catch { /* continue text-only */ }
    } else if (media_type === 'image' && media_url) {
      try {
        const imgRes = await fetch(media_url, { headers: { Referer: 'https://www.facebook.com/' } })
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const safeType = detectImageType(buffer)
          messages[0] = { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: safeType, data: base64 } }, { type: 'text', text: userMessage }] }
        }
      } catch { /* continue text-only */ }
    }

    let rawResponse: string
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT + brandTypeContext,
        messages,
      })
      rawResponse = response.content[0].type === 'text' ? response.content[0].text : ''
    } catch (err) {
      console.error('[analyze] Claude API error:', err)
      return NextResponse.json({ error: 'Claude API failed — retry' }, { status: 502 })
    }

    let parsed: AnalysisResult
    try {
      parsed = safeParseJSON(rawResponse)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse Claude response', raw: rawResponse },
        { status: 500 }
      )
    }

    let updateSuccess = false
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await AdsTable.update(adId, {
          [ADS_FIELDS.hook_type]: sanitize(parsed.hook_type, VALID.hook_type, 'benefit'),
          [ADS_FIELDS.copy_angle]: sanitize(parsed.copy_angle, VALID.copy_angle, 'matter_of_fact'),
          [ADS_FIELDS.format]: sanitize(parsed.format, VALID.format, 'static_image'),
          [ADS_FIELDS.offer_type]: sanitize(parsed.offer_type, VALID.offer_type, 'none'),
          [ADS_FIELDS.whitepaper_overlap_score]: Math.min(10, Math.max(1, Number(parsed.whitepaper_overlap_score) || 5)),
          [ADS_FIELDS.ai_summary]: parsed.ai_summary || '',
          [ADS_FIELDS.ai_raw_response]: rawResponse,
          [ADS_FIELDS.ai_analyzed]: true,
        })
        updateSuccess = true
        break
      } catch (err) {
        console.error(`[analyze] Airtable update attempt ${attempt} failed:`, err)
      }
    }

    return NextResponse.json({ success: true, airtable_updated: updateSuccess, analysis: parsed })
  } catch (err) {
    console.error('[analyze]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
