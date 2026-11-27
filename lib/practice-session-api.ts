const apiUrl = process.env.NEXT_PUBLIC_TALEEQ_API_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const sessionApiEnabled = Boolean(apiUrl && supabaseUrl && publishableKey)

export async function loadRecentSessions(token: string, signal: AbortSignal) {
  if (!apiUrl) throw new Error('configuration')
  const result = await fetch(`${apiUrl}/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal,
  })
  if (!result.ok) throw new Error('history')
  const rows: { id: string; practice_type: 'interview' | 'presentation'; ended_at: string }[] = await result.json()
  return rows.map(row => ({ id: row.id, practice: row.practice_type, completedAt: row.ended_at }))
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
