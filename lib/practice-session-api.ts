const apiUrl = process.env.NEXT_PUBLIC_TALEEQ_API_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const sessionApiEnabled = Boolean(apiUrl && supabaseUrl && publishableKey)

export type SavedPracticeReport = { comments: string[]; recording: boolean }

function recordingStorage(token: string, sessionId: string) {
  if (!supabaseUrl || !publishableKey) throw new Error('configuration')
  return {
    url: `${supabaseUrl.replace(/\/$/, '')}/storage/v1`,
    path: `practice-recordings/${encodeURIComponent(sessionId)}/recording`,
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
  }
}

export async function recordingUrl(token: string, sessionId: string) {
  const storage = recordingStorage(token, sessionId)
  const result = await fetch(`${storage.url}/object/sign/${storage.path}`, {
    method: 'POST',
    headers: { ...storage.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 900 }),
    signal: AbortSignal.timeout(15000),
  })
  if (!result.ok) throw new Error('playback')
  const { signedURL } = await result.json()
  if (typeof signedURL !== 'string' || !signedURL.startsWith('/object/sign/')) throw new Error('playback')
  return storage.url + signedURL
}

export async function uploadSessionRecording(token: string, sessionId: string, recording: Blob) {
  const storage = recordingStorage(token, sessionId)
  const upload = await fetch(`${storage.url}/object/${storage.path}`, {
    method: 'POST',
    headers: { ...storage.headers, 'Content-Type': recording.type.split(';')[0] },
    body: recording,
    signal: AbortSignal.timeout(120000),
  })
  if (!upload.ok) await recordingUrl(token, sessionId)
}

export async function saveSessionReport(token: string, sessionId: string, report: SavedPracticeReport) {
  if (!apiUrl) throw new Error('configuration')
  const result = await fetch(`${apiUrl}/sessions/${encodeURIComponent(sessionId)}/report`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
    signal: AbortSignal.timeout(25000),
  })
  if (!result.ok) throw new Error('report')
}

export async function loadRecentSessions(token: string, signal: AbortSignal) {
  if (!apiUrl) throw new Error('configuration')
  const result = await fetch(`${apiUrl}/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal,
  })
  if (!result.ok) throw new Error('history')
  const rows: { id: string; practice_type: 'interview' | 'presentation'; ended_at: string; interview_score?: number | null; report?: SavedPracticeReport | null }[] = await result.json()
  return rows.map(row => ({ id: row.id, practice: row.practice_type, completedAt: row.ended_at, interviewScore: row.interview_score ?? undefined, report: row.report ?? undefined }))
}

export type SignedInAccount = { email: string; token: string; expiresAt: number }

export async function signIn(email: string, password: string): Promise<SignedInAccount> {
  if (!supabaseUrl || !publishableKey) throw new Error('configuration')

  const login = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15000),
  })
  if (!login.ok) throw new Error('login')
  const { access_token: token, expires_in: expiresIn } = await login.json()
  if (typeof token !== 'string' || !token || typeof expiresIn !== 'number' ||
      !Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error('login')

  return { email, token, expiresAt: Date.now() + expiresIn * 1000 }
}

export async function validateSignIn(token: string, signal: AbortSignal) {
  if (!supabaseUrl || !publishableKey) return false
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal,
  })
  if (!response.ok) return false
  const user = await response.json()
  return typeof user?.id === 'string' && Boolean(user.id)
}

export async function savePracticeStart(token: string, practiceType: 'interview' | 'presentation'): Promise<string> {
  if (!apiUrl) throw new Error('configuration')
  const result = await fetch(`${apiUrl}/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ practice_type: practiceType }),
    signal: AbortSignal.timeout(25000),
  })
  if (!result.ok) throw new Error('save')
  const { id } = await result.json()
  if (typeof id !== 'string' || !id) throw new Error('save')
  return id
}

export async function savePracticeEnd(token: string, sessionId: string) {
  if (!apiUrl) throw new Error('configuration')
  const result = await fetch(`${apiUrl}/sessions/${encodeURIComponent(sessionId)}/finish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(25000),
  })
  if (!result.ok) throw new Error('finish')
}
