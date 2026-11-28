'use client'

import { useState } from 'react'
import type { Language } from './copy'

type InterviewScorePoint = { id: string; score: number; completedAt: string }

const scale = [100, 75, 50, 25, 0]
const scorePoint = (index: number, count: number) => (index + 0.5) / count * 100

export function InterviewScoreChart({ points, language, unavailable }: {
  points: InterviewScorePoint[]
  language: Language
  unavailable: boolean
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const ar = language === 'ar'
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const signedNumber = new Intl.NumberFormat(language, { signDisplay: 'exceptZero' })
  const shortDate = new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' })
  const fullDate = new Intl.DateTimeFormat(language, { dateStyle: 'long', timeStyle: 'short' })
  const latest = points.at(-1)
  const selected = points.find(point => point.id === selectedId) ?? latest
  const previous = points.at(-2)
  const change = latest && previous ? latest.score - previous.score : null
  const average = points.length ? points.reduce((sum, point) => sum + point.score, 0) / points.length : null
  const scoreLabel = (score: number) => `${number.format(score)} / ${number.format(100)}`

  return (
    <section aria-labelledby="interview-progress-title" className="mt-4 rounded-2xl border border-border bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
        <h3 id="interview-progress-title" tabIndex={-1} className="scroll-mt-6 text-lg font-semibold text-sidebar focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          {ar ? 'تطوّر درجات المقابلات' : 'Interview score trend'}
        </h3>
        <span className="text-sm text-muted-foreground">{ar ? 'الدرجة من ١٠٠' : 'Score out of 100'}</span>
      </div>

      {!latest || !selected || average === null ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          {unavailable
            ? (ar ? 'بتظهر الدرجات لما يتحمّل سجل الجلسات.' : 'Scores appear once your session history loads.')
            : (ar ? 'أكملي مقابلة واستني ينحفظ التقييم حتى تظهر أول درجة.' : 'Finish an interview and wait for the evaluation to be saved to see your first score.')}
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-3 divide-x divide-border border-y border-border rtl:divide-x-reverse">
            <div className="min-w-0 py-3 pe-2 sm:pe-4">
              <dt className="text-xs text-muted-foreground sm:text-sm">{ar ? 'آخر درجة' : 'Latest score'}</dt>
              <dd className="mt-1 text-xl font-semibold text-sidebar"><bdi>{number.format(latest.score)}</bdi></dd>
            </div>
            <div className="min-w-0 px-2 py-3 sm:px-4">
              <dt className="text-xs text-muted-foreground sm:text-sm">{ar ? 'المتوسط' : 'Average'}</dt>
              <dd className="mt-1 text-xl font-semibold text-sidebar"><bdi>{number.format(average)}</bdi></dd>
            </div>
            <div className="min-w-0 py-3 ps-2 sm:ps-4">
              <dt className="text-xs text-muted-foreground sm:text-sm">{ar ? 'مقارنة بالسابقة' : 'Vs. previous'}</dt>
              <dd className={`mt-1 text-xl font-semibold ${change && change > 0 ? 'text-success' : change && change < 0 ? 'text-primary' : 'text-sidebar'}`}>
                {change === null ? '—' : (
                  <><bdi>{signedNumber.format(change)}</bdi><span className="ms-1 text-xs font-normal text-muted-foreground">{ar ? 'نقطة' : 'pts'}</span></>
                )}
              </dd>
            </div>
          </dl>

          <figure className="mt-4">
            <div dir="ltr" className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 gap-y-4 pt-3 sm:gap-x-3">
              <div aria-hidden="true" className="relative h-36 text-xs tabular-nums text-muted-foreground sm:h-44">
                {scale.map(value => (
                  <span key={value} className="absolute end-0 -translate-y-1/2" style={{ top: `${100 - value}%` }}>
                    {number.format(value)}
                  </span>
                ))}
              </div>

              <div className="relative h-36 rounded-lg bg-background/65 sm:h-44">
                {scale.map(value => (
                  <div key={value} aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-border" style={{ top: `${100 - value}%` }} />
                ))}
                {points.length > 1 && (
                  <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                    <polyline
                      points={points.map((point, index) => `${scorePoint(index, points.length)},${100 - point.score}`).join(' ')}
                      fill="none"
                      stroke="#427d72"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                )}
                {points.map((point, index) => (
                  <button
                    key={point.id}
                    type="button"
                    aria-label={`${fullDate.format(new Date(point.completedAt))} · ${scoreLabel(point.score)}`}
                    aria-pressed={point.id === selected.id}
                    onClick={() => setSelectedId(point.id)}
                    title={scoreLabel(point.score)}
                    className="absolute grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                    style={{ left: `${scorePoint(index, points.length)}%`, top: `${100 - point.score}%` }}
                  >
                    <span aria-hidden="true" className={`size-3 rounded-full border-2 border-[#427d72] ${point.id === selected.id ? 'bg-[#427d72] ring-4 ring-[#427d72]/20' : 'bg-card'}`} />
                  </button>
                ))}
              </div>

              <div aria-hidden="true" className="col-start-2 grid gap-1 text-center text-xs text-muted-foreground" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
                {points.map(point => <bdi key={point.id}>{shortDate.format(new Date(point.completedAt))}</bdi>)}
              </div>
            </div>

            <figcaption role="status" className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg bg-background px-3 py-2 text-sm text-muted-foreground">
              <time dateTime={selected.completedAt}>{fullDate.format(new Date(selected.completedAt))}</time>
              <bdi dir="ltr" className="font-semibold text-sidebar">{scoreLabel(selected.score)}</bdi>
            </figcaption>
          </figure>
        </>
      )}
    </section>
  )
}
