import { useId } from 'react'
import { MessageSquareText, Video } from 'lucide-react'
import { chartPercentages, type PerformanceChartData } from '@/lib/performance-report-charts'
import { copy, type Language } from './copy'

const colors = {
  mint: { fill: '#BCE8D2', edge: '#175D43' },
  peach: { fill: '#FCD4A5', edge: '#85420F' },
  lavender: { fill: '#DCD0FA', edge: '#50348A' },
  apricot: { fill: '#F4B77C', edge: '#85420F' },
}

type Color = keyof typeof colors
type Category = { label: string; count: number; color: Color }
type Segment = { size: number; color: Color }

// The downloaded HTML uses the same styles as the live and saved reports.
export const reportChartStyles = `
.taleek-charts { display: grid; gap: 1rem; grid-template-columns: minmax(0,1fr); }
@media (min-width: 640px) { .taleek-charts { grid-template-columns: repeat(2,minmax(0,1fr)); } }
.taleek-chart { min-width: 0; padding: 1.125rem; color: #182D43; background: white; border: 1px solid #e6eaf1; border-radius: .75rem; break-inside: avoid; }
.taleek-chart h3 { margin: 0; color: #142B49; font-size: 1rem; font-weight: 700; }
.taleek-chart figure { margin: 0; }
.taleek-chart svg { display: block; }
.taleek-chart .report-ring { width: 100%; max-width: 12.5rem; height: auto; margin: .625rem auto; overflow: visible; }
.taleek-chart ul { display: grid; gap: .4rem; margin: 0; padding: 0; list-style: none; }
.taleek-chart li { display: flex; align-items: center; gap: .5rem; font-size: .875rem; line-height: 1.4; }
.taleek-chart .report-swatch { width: .7rem; height: .7rem; flex: none; border: 1px solid; border-radius: 50%; }
.taleek-chart .report-count { margin-inline-start: auto; font-variant-numeric: tabular-nums; white-space: nowrap; }
.taleek-chart p { margin: .75rem 0 0; font-size: .875rem; line-height: 1.5; color: #315B82; }
.taleek-chart p.report-basis { margin-top: .4rem; font-size: .75rem; }
.taleek-chart details { margin-top: .75rem; font-size: .8rem; }
.taleek-chart summary { cursor: pointer; }
.taleek-chart ol { padding-inline-start: 1.5rem; }
.taleek-chart ol li { display: list-item; }
@media (prefers-reduced-motion: no-preference) {
  .taleek-chart { animation: taleek-chart-enter 350ms ease-out both; }
}
@keyframes taleek-chart-enter { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
@media print {
  .taleek-chart { animation: none; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
`

function Ring({ title, summary, segments, half, center }: {
  title: string
  summary: string
  segments: Segment[]
  half: boolean
  center?: number
}) {
  const id = useId()
  const radius = 72
  const sweep = half ? 180 : 360
  const start = half ? 180 : -90
  const thickness = half ? 22 : 15
  const point = (angle: number) => {
    const radians = angle * Math.PI / 180
    return [100 + radius * Math.cos(radians), 100 + radius * Math.sin(radians)].join(' ')
  }
  const arc = (from: number, degrees: number) =>
    `M ${point(from)} A ${radius} ${radius} 0 ${degrees > 180 ? 1 : 0} 1 ${point(from + degrees)}`

  const nonEmpty = segments.filter(segment => segment.size > 0)
  const total = nonEmpty.reduce((sum, segment) => sum + segment.size, 0)
  const first = nonEmpty[0]
  const active = first && nonEmpty.every(segment => segment.color === first.color)
    ? [{ size: total, color: first.color }]
    : nonEmpty
  let position = start
  const Icon = half ? Video : MessageSquareText

  return (
    <svg className="report-ring" viewBox={half ? '0 8 200 116' : '0 8 200 184'} role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-description`}>{summary}</desc>
      {total === 0 && (half
        ? <path d={arc(start, sweep)} fill="none" stroke="#D9BCA5" strokeWidth="3" strokeDasharray="4 5" strokeLinecap="round" />
        : <circle cx="100" cy="100" r={radius} fill="none" stroke="#D9BCA5" strokeWidth="3" strokeDasharray="4 5" />)}
      {active.map((segment, index) => {
        const degrees = sweep * segment.size / total
        const gap = active.length === 1 ? 0 : Math.min(7, degrees / 3)
        const path = arc(position + gap / 2, degrees - gap)
        position += degrees
        const { fill, edge } = colors[segment.color]
        const full = active.length === 1 && !half
        return (
          <g key={index} fill="none" strokeLinecap={active.length <= 2 && gap === 0 ? 'round' : 'butt'}>
            {full ? <>
              <circle cx="100" cy="100" r={radius} stroke={edge} strokeWidth={thickness} />
              <circle cx="100" cy="100" r={radius} stroke={fill} strokeWidth={thickness - 2} />
            </> : <>
              <path d={path} stroke={edge} strokeWidth={thickness} />
              <path d={path} stroke={fill} strokeWidth={thickness - 2} />
            </>}
          </g>
        )
      })}
      {center === undefined
        ? <Icon x={87} y={half ? 76 : 87} width={26} height={26} color="#315B82" aria-hidden="true" />
        : <text x="100" y="100" textAnchor="middle" dominantBaseline="central" fontSize="32" fontWeight="700" fill="#142B49">{center}</text>}
    </svg>
  )
}

function ChartCard({ title, categories, segments, takeaway, basis, camera = false, center, orderLabel, order }: {
  title: string
  categories: Category[]
  segments: Segment[]
  takeaway: string
  basis?: string
  camera?: boolean
  center?: number
  orderLabel?: string
  order?: string[]
}) {
  const id = useId()
  const percentages = chartPercentages(categories.map(category => category.count))
  const legend = categories.map(({ label, count }, index) => `${label} (${count}, ${percentages[index]}%)`)
  return (
    <section className="taleek-chart" aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      <figure>
        <Ring title={title} summary={[...legend, takeaway, basis].filter(Boolean).join(' · ')} half={camera} segments={segments} center={center} />
        <figcaption>
          {categories.length > 0 && <ul>{categories.map(({ label, count, color }, index) => (
            <li key={color}>
              <span aria-hidden="true" className="report-swatch" style={{ backgroundColor: colors[color].fill, borderColor: colors[color].edge }} />
              <span>{label}</span>
              <bdi dir="ltr" className="report-count">{count} · {percentages[index]}%</bdi>
            </li>
          ))}</ul>}
          <p>{takeaway}</p>
          {basis && <p className="report-basis">{basis}</p>}
          {!!order?.length && <details><summary>{orderLabel}</summary><ol>{order.map((label, index) => <li key={index}>{label}</li>)}</ol></details>}
        </figcaption>
      </figure>
    </section>
  )
}

export function PerformanceReportCharts({ data, language }: { data: PerformanceChartData; language: Language }) {
  const t = copy[language].reportCharts
  const { camera, questions } = data
  const answered = questions?.filter(Boolean).length ?? 0
  const shown = questions?.length ?? 0
  const cameraAvailable = camera.total >= 8 && camera.visible >= 0 && camera.visible <= camera.total
  const cameraCategories: Category[] = cameraAvailable ? [
    { label: t.visible, count: camera.visible, color: 'lavender' },
    { label: t.notVisible, count: camera.total - camera.visible, color: 'apricot' },
  ] : []
  return (
    <div className="taleek-charts" lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <style>{reportChartStyles}</style>
      {questions && <ChartCard title={t.questions} categories={shown ? [
        { label: t.answered, count: answered, color: 'mint' },
        { label: t.unanswered, count: shown - answered, color: 'peach' },
      ] : []} segments={questions.map(answered => ({ size: 1, color: answered ? 'mint' : 'peach' }))}
        center={shown ? shown : undefined} orderLabel={t.questionOrder}
        order={questions.map(answered => answered ? t.answered : t.unanswered)}
        takeaway={!shown ? t.questionsEmpty : answered === shown ? t.questionsAll : answered ? t.questionsSome : t.questionsNone} />}
      <ChartCard camera title={t.camera} categories={cameraCategories}
        segments={cameraCategories.map(({ count, color }) => ({ size: count, color }))}
        basis={cameraAvailable ? t.cameraBasis : undefined}
        takeaway={!cameraAvailable ? t.cameraEmpty : camera.visible === camera.total ? t.cameraAll : camera.visible ? t.cameraSome : t.cameraNone} />
    </div>
  )
}
