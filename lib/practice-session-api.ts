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

export async function saveSessionArtifacts(token: string, sessionId: string, comments: string[], recording?: Blob) {
  if (!apiUrl) throw new Error('configuration')
  if (recording) {
    const storage = recordingStorage(token, sessionId)
    const upload = await fetch(`${storage.url}/object/${storage.path}`, {
      method: 'POST',
      headers: { ...storage.headers, 'Content-Type': recording.type.split(';')[0] },
      body: recording,
      signal: AbortSignal.timeout(120000),
    })
    if (!upload.ok) await recordingUrl(token, sessionId)
  }
  const result = await fetch(`${apiUrl}/sessions/${encodeURIComponent(sessionId)}/report`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comments, recording: Boolean(recording) }),
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
  const rows: { id: string; practice_type: 'interview' | 'presentation'; ended_at: string; report?: SavedPracticeReport | null }[] = await result.json()
  return rows.map(row => ({ id: row.id, practice: row.practice_type, completedAt: row.ended_at, report: row.report ?? undefined }))
}

export async function signIn(email: string, password: string): Promise<string> {
  if (!supabaseUrl || !publishableKey) throw new Error('configuration')

  const login = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15000),
  })
  if (!login.ok) throw new Error('login')
  const { access_token: token } = await login.json()
  if (typeof token !== 'string' || !token) throw new Error('login')
  return token
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

