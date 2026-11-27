import { AudioLines, ChevronDown, Clock3, MessageSquareText } from 'lucide-react'
import type { DashboardCopy, Language } from './copy'
import { AssessmentCriteria } from './assessment-criteria'

const storageKey = 'speakwell.recent-sessions'
const sessionLimit = 5

export type PracticeId = 'presentation' | 'interview'
export type InterviewType = 'personal' | 'technical'

export type SessionRecord = {
  id: string
  practice: PracticeId
  completedAt: string
  interviewType?: InterviewType
}

function isSessionRecord(value: unknown): value is SessionRecord {
  if (!value || typeof value !== 'object') return false
  const { id, practice, completedAt, interviewType } = value as Partial<SessionRecord>
  return typeof id === 'string'
    && (practice === 'presentation' || practice === 'interview')
    && (interviewType === undefined || (practice === 'interview' && (interviewType === 'personal' || interviewType === 'technical')))
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

export function saveSession(practice: PracticeId, current: SessionRecord[], interviewType?: InterviewType): SessionRecord[] {
  const record = { id: crypto.randomUUID(), practice, interviewType, completedAt: new Date().toISOString() }
  try {
    const previous = localStorage.getItem(storageKey) === null ? current : readSessions()
    const recent = [record, ...previous].slice(0, sessionLimit)
    localStorage.setItem(storageKey, JSON.stringify(recent))
    return recent
  } catch {
    return [record, ...current].slice(0, sessionLimit)
  }
}

export function RecentSessions({ sessions, text, language, historyMessage }: {
  sessions: SessionRecord[]
  text: DashboardCopy
  language: Language
  historyMessage?: string
}) {
  return (
    <section id="recent-sessions" aria-labelledby="recent-sessions-title" className="mt-7 scroll-mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 id="recent-sessions-title" className="text-lg font-semibold">{text.recent}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text.recentDescription}</p>
        </div>
        <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground sm:mt-0">
          <Clock3 aria-hidden="true" className="size-3.5" />
          {text.reportUnavailable}
        </span>
      </div>
      {historyMessage || sessions.length === 0 ? (
        <p role="status" className="mt-5 rounded-xl border border-dashed border-border bg-background px-4 py-5 text-sm leading-relaxed text-muted-foreground">{historyMessage ?? text.emptyHistory}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {sessions.map((session) => {
            const option = text.modes[session.practice]
            const interviewType = session.interviewType
            const isTechnical = interviewType === 'technical'
            const Icon = session.practice === 'presentation' ? AudioLines : MessageSquareText

            return (
              <li key={session.id}>
                <details className="group rounded-xl border border-border bg-background open:bg-card">
                  <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl p-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{option.title}{interviewType && ` · ${text.interviewSetup[interviewType]}`}</span>
                      <time dateTime={session.completedAt} className="mt-1 block text-xs text-muted-foreground">
                        {new Date(session.completedAt).toLocaleDateString(language, { dateStyle: 'medium' })}
                      </time>
                    </span>
                    <span className="hidden rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex">{text.reportUnavailable}</span>
                    <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-border px-4 pb-4 pt-3 sm:px-5">
                    <p className="mb-3 text-xs font-semibold text-muted-foreground">{text.sessionDetails}</p>
                    <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
                      <p>{isTechnical ? text.interviewSetup.technicalPrompt : option.prompt}</p>
                      <AssessmentCriteria title={text.assessment} criteria={isTechnical ? text.interviewSetup.technicalCriteria : option.criteria} />
                    </div>
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
