import type { Language } from './copy'
import type { SessionRecord } from './recent-sessions'
import { InterviewScoreChart } from './interview-score-chart'

export function TrainingCharts({ sessions, language, historyMessage }: {
  sessions: SessionRecord[]
  language: Language
  historyMessage?: string
}) {
  const ar = language === 'ar'
  const hasData = !historyMessage && sessions.length > 0
  const recent = sessions.slice(0, 5)
  const formatNumber = new Intl.NumberFormat(language)
  const dateFormat = new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' })
  const days = new Map<string, { label: string; count: number }>()

  // The history response is newest first. Group it by local calendar day, oldest first.
  for (const session of [...recent].reverse()) {
    const date = new Date(session.completedAt)
    if (!Number.isFinite(date.getTime())) continue
    const key = date.toDateString()
    const day = days.get(key)
    if (day) day.count += 1
    else days.set(key, { label: dateFormat.format(date), count: 1 })
  }

  const peak = Math.max(1, ...Array.from(days.values(), day => day.count))
  const scoredInterviews = [...recent].reverse().flatMap(session => {
    const score = session.interviewScore
    const date = new Date(session.completedAt)
    if (session.practice !== 'interview' || typeof score !== 'number' ||
        !Number.isInteger(score) || score < 0 || score > 100 || !Number.isFinite(date.getTime())) return []
    return [{ id: session.id, score, completedAt: session.completedAt }]
  })
  const interviews = recent.filter(session => session.practice === 'interview').length
  const presentations = recent.length - interviews
  const breakdown = [
    { label: ar ? 'مقابلات العمل' : 'Interviews', count: interviews, color: 'bg-[#427d72]' },
    { label: ar ? 'العروض التقديمية' : 'Presentations', count: presentations, color: 'bg-[#c76c44]' },
  ]

  return (
    <section id="activity" aria-labelledby="activity-title" className="mt-9 scroll-mt-6 border-t border-border pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="activity-title" className="text-xl font-semibold sm:text-2xl">{ar ? 'نشاطك التدريبي' : 'Your practice activity'}</h2>
        <p className="text-sm text-muted-foreground">{ar ? 'من آخر خمس جلسات مكتملة' : 'Based on your last five completed sessions'}</p>
      </div>
      <InterviewScoreChart points={hasData ? scoredInterviews : []} language={language} unavailable={Boolean(historyMessage)} />

      {!hasData && (
        <p role="status" className="mt-4 rounded-xl border border-dashed border-border bg-card px-5 py-6 text-sm text-muted-foreground">
          {historyMessage ?? (ar ? 'أكمل أول جلسة ليظهر نشاطك هون.' : 'Finish your first session to see your activity here.')}
        </p>
      )}
      <div className="mt-4 grid overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[1.55fr_1fr]">
          <figure className="border-b border-border p-5 sm:p-6 md:border-b-0 md:border-e">
            <figcaption className="font-semibold">{ar ? 'الجلسات حسب اليوم' : 'Sessions by day'}</figcaption>
            {hasData && days.size > 0 ? (
              <ul className="mt-4 flex items-end justify-around gap-2" role="list">
              {Array.from(days, ([key, day]) => (
                <li key={key} className="min-w-0 flex-1 text-center text-xs text-muted-foreground">
                  <div className="flex h-24 flex-col justify-end border-b border-border px-1 pb-1">
                    <span className="mb-1 font-semibold text-sidebar">{formatNumber.format(day.count)}</span>
                    <span aria-hidden="true" className="mx-auto w-full max-w-12 shrink-0 rounded-t-md bg-[#427d72]" style={{ height: `${day.count / peak * 58}px` }} />
                  </div>
                  <span className="mt-2 block leading-tight">{day.label}</span>
                </li>
              ))}
              </ul>
            ) : (
              <div aria-hidden="true" className="mt-4 h-24 rounded-lg border border-dashed border-border bg-background/70" />
            )}
          </figure>
          <figure className="p-5 sm:p-6">
            <figcaption className="font-semibold">{ar ? 'توزيع أنواع التدريب' : 'Practice by type'}</figcaption>
            <div aria-hidden="true" className="mt-5 flex h-4 overflow-hidden rounded-full bg-muted">
              {hasData && breakdown.map(item => (
                <span key={item.label} className={item.color} style={{ width: `${item.count / recent.length * 100}%` }} />
              ))}
            </div>
            <ul className="mt-4 space-y-2 text-sm" role="list">
              {breakdown.map(item => (
                <li key={item.label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                  <span className="font-semibold">{hasData ? formatNumber.format(item.count) : '—'}</span>
                </li>
              ))}
            </ul>
          </figure>
      </div>
    </section>
  )
}
