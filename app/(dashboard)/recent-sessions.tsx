const storageKey = 'speakwell.recent-sessions'
const sessionLimit = 5

export type PracticeId = 'presentation' | 'interview'

export type SessionRecord = {
  id: string
  practice: PracticeId
  completedAt: string
}

function isSessionRecord(value: unknown): value is SessionRecord {
  if (!value || typeof value !== 'object') return false
  const { id, practice, completedAt } = value as Partial<SessionRecord>
  return typeof id === 'string'
    && (practice === 'presentation' || practice === 'interview')
    && typeof completedAt === 'string'
    && Number.isFinite(Date.parse(completedAt))
}

export function readSessions(): SessionRecord[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(saved) ? saved.filter(isSessionRecord).slice(0, sessionLimit) : []
  } catch {
    return []
  }
}

export function saveSession(practice: PracticeId, current: SessionRecord[]): SessionRecord[] {
  const record = { id: crypto.randomUUID(), practice, completedAt: new Date().toISOString() }
  try {
    const previous = localStorage.getItem(storageKey) === null ? current : readSessions()
    const recent = [record, ...previous].slice(0, sessionLimit)
    localStorage.setItem(storageKey, JSON.stringify(recent))
    return recent
  } catch {
    return [record, ...current].slice(0, sessionLimit)
  }
}

export function RecentSessions({ sessions, options }: {
  sessions: SessionRecord[]
  options: readonly { id: PracticeId; title: string; prompt: string; review: string }[]
}) {
  return (
    <section id="recent-sessions" aria-labelledby="recent-sessions-title" className="mt-7 scroll-mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 id="recent-sessions-title" className="text-lg font-semibold">Recent sessions</h2>
      {sessions.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Complete a practice session to revisit its prompt and self-review here.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {sessions.map((session) => {
            const option = options.find(({ id }) => id === session.practice)
            if (!option) return null

            return (
              <li key={session.id} className="py-2">
                <details>
                  <summary className="cursor-pointer rounded py-1 text-sm font-medium">
                    {option.title}{' '}
                    <time dateTime={session.completedAt} className="ml-2 font-normal text-muted-foreground">
                      {new Date(session.completedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </time>
                  </summary>
                  <div className="space-y-2 px-4 pb-2 pt-1 text-sm leading-relaxed text-muted-foreground">
                    <p>{option.prompt}</p>
                    <p><strong className="text-foreground">Self-review.</strong> {option.review}</p>
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
