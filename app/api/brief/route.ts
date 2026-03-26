import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAdsTable } from '@/lib/airtable'

const BRIEF_SYSTEM = `You are a senior creative strategist who writes ad briefs for copywriters and designers. You analyze a competitor ad and produce a clear, actionable brief that a team can use to create a differentiated ad inspired by it — not copied from it.

Be specific and direct. Every line should be something a copywriter can act on immediately. No fluff, no generic advice.`

export async function POST(req: NextRequest) {
  try {
    const { adId } = await req.json()
    if (!adId) return NextResponse.json({ error: 'adId required' }, { status: 400 })

    let record
    try {
      record = await getAdsTable().find(adId)
    } catch {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    const headline = (record.get('headline') as string) || ''
    const body_copy = (record.get('body_copy') as string) || ''
    const cta_text = (record.get('cta_text') as string) || ''
    const brand_name = (record.get('brand_name') as string) || ''
    const hook_type = (record.get('hook_type') as string) || ''
    const copy_angle = (record.get('copy_angle') as string) || ''
    const offer_type = (record.get('offer_type') as string) || ''
    const format = (record.get('format') as string) || ''
    const ai_summary = (record.get('ai_summary') as string) || ''
    const ad_start_date = (record.get('ad_start_date') as string) || ''
    const score = (record.get('whitepaper_overlap_score') as number) || 0

    const daysRunning = ad_start_date
      ? Math.floor((Date.now() - new Date(ad_start_date).getTime()) / 86_400_000)
      : null

    const prompt = `Competitor ad running ${daysRunning !== null ? `${daysRunning} days` : 'unknown duration'}, scored ${score}/10.

Brand: ${brand_name}
Hook: ${hook_type} | Angle: ${copy_angle} | Offer: ${offer_type} | Format: ${format}
Headline: ${headline || '(none)'}
Body: ${body_copy || '(none)'}
CTA: ${cta_text || '(none)'}
AI read: ${ai_summary || '(none)'}

Write a creative brief for a competing brand to create their own version. Use these exact headers:

**What works**
[1-2 sentences on the core mechanic that makes this ad effective]

**Hook to use**
[Specific hook type + a concrete first-line example they can adapt]

**Copy angle**
[The tone and angle to write in, with one example sentence]

**Offer to lead with**
[Recommended offer and why it fits a cold audience]

**Format**
[Creative format recommendation and why]

**How to differentiate**
[One specific thing to do better or differently than this ad]`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system: BRIEF_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })

    const firstContent = response.content[0]
    if (!firstContent || firstContent.type !== 'text' || !firstContent.text) {
      return NextResponse.json({ error: 'Claude returned empty response' }, { status: 502 })
    }
    return NextResponse.json({ brief: firstContent.text })
  } catch (err) {
    console.error('[brief]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
