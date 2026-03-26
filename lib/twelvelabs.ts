/**
 * TwelveLabs video analysis helper.
 *
 * Flow:
 *   1. Get (or create) a persistent Pegasus index for this app
 *   2. Upload the video by URL and wait for indexing to finish
 *   3. Ask Pegasus to describe the ad's visual content and narrative
 *   4. Delete the video from the index (saves storage credits)
 *   5. Return the description so Claude can produce structured JSON
 */

const BASE = 'https://api.twelvelabs.io/v1.3'
const INDEX_NAME = 'raccon-ads'

// In-process cache so we don't call /indexes on every request
let _indexId: string | null = null

function headers() {
  const key = process.env.TWELVE_LABS_API_KEY
  if (!key) throw new Error('TWELVE_LABS_API_KEY is not set')
  return {
    'x-api-key': key,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

async function getOrCreateIndex(): Promise<string> {
  if (_indexId) return _indexId

  // Try to find an existing index by name
  const listRes = await fetch(`${BASE}/indexes?page_limit=50`, { headers: headers() })
  if (!listRes.ok) throw new Error(`TwelveLabs list indexes failed: ${listRes.status}`)
  const listData = await listRes.json()
  const existing = (listData.data ?? []).find((i: { index_name: string; _id: string }) => i.index_name === INDEX_NAME)

  if (existing) {
    _indexId = existing._id
    return _indexId!
  }

  // Create a new Pegasus index (visual + audio so it understands speech and visuals)
  const createRes = await fetch(`${BASE}/indexes`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      index_name: INDEX_NAME,
      models: [
        {
          name: 'pegasus1.2',
          options: ['visual', 'audio'],
        },
      ],
    }),
  })
  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`TwelveLabs create index failed: ${createRes.status} — ${err}`)
  }
  const created = await createRes.json()
  _indexId = created._id
  return _indexId!
}

async function uploadVideoByUrl(indexId: string, videoUrl: string): Promise<string> {
  const res = await fetch(`${BASE}/indexes/${indexId}/tasks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ video_url: videoUrl }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`TwelveLabs upload failed: ${res.status} — ${err}`)
  }
  const data = await res.json()
  return data._id as string // task_id
}

async function waitForReady(taskId: string, timeoutMs = 180_000): Promise<string | null> {
  const deadline = Date.now() + timeoutMs
  const INTERVAL = 6_000 // poll every 6 seconds

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, INTERVAL))

    const res = await fetch(`${BASE}/tasks/${taskId}`, { headers: headers() })
    if (!res.ok) continue

    const task = await res.json()
    if (task.status === 'ready') return task.video_id as string
    if (task.status === 'failed') return null
    // status is 'pending' | 'indexing' — keep polling
  }

  return null // timed out
}

async function generateAnalysis(indexId: string, videoId: string, prompt: string): Promise<string> {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      video_id: videoId,
      prompt,
      type: 'open-ended',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`TwelveLabs generate failed: ${res.status} — ${err}`)
  }
  const data = await res.json()
  return (data.data ?? '') as string
}

async function deleteVideo(indexId: string, videoId: string): Promise<void> {
  await fetch(`${BASE}/indexes/${indexId}/videos/${videoId}`, {
    method: 'DELETE',
    headers: headers(),
  }).catch(() => { /* non-critical — ignore cleanup failures */ })
}

// ─── Public API ───────────────────────────────────────────────────────────────

const VIDEO_PROMPT = `You are analyzing a Meta ad video for a media intelligence tool.
Describe in detail:
- What is shown visually (people, text on screen, scenes, graphics)
- What is said or heard (voiceover, dialogue, music tone)
- The emotional tone and energy of the ad
- The core message being communicated
- What offer or call to action is presented
- The hook used in the first 3 seconds
Be specific and factual. 2-4 sentences.`

/**
 * Analyze a video ad using TwelveLabs Pegasus.
 * Returns a rich text description, or null if analysis failed/timed out.
 */
export async function analyzeVideoWithTwelveLabs(videoUrl: string): Promise<string | null> {
  const indexId = await getOrCreateIndex()
  const taskId = await uploadVideoByUrl(indexId, videoUrl)
  const videoId = await waitForReady(taskId)

  if (!videoId) return null

  const description = await generateAnalysis(indexId, videoId, VIDEO_PROMPT)
  await deleteVideo(indexId, videoId)

  return description || null
}
