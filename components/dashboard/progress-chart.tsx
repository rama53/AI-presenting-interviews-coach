const scores = [
  { week: 'Apr 08', score: 58 },
  { week: 'Apr 15', score: 63 },
  { week: 'Apr 22', score: 61 },
  { week: 'Apr 29', score: 72 },
  { week: 'May 06', score: 70 },
  { week: 'May 13', score: 79 },
  { week: 'May 20', score: 84 },
  { week: 'May 27', score: 88 },
]

const chart = { width: 680, height: 220, left: 34, right: 14, top: 16, bottom: 30 }
const chartWidth = chart.width - chart.left - chart.right
const chartHeight = chart.height - chart.top - chart.bottom
const yFor = (score: number) => chart.top + ((100 - score) / 100) * chartHeight
const xFor = (index: number) => chart.left + (index / (scores.length - 1)) * chartWidth
const path = scores.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point.score)}`).join(' ')

export function ProgressChart() {
  return (
    <div className="mt-5" role="img" aria-label="Your communication score increased from 58 to 88 over the past eight weeks">
      <div className="mb-2 flex items-center justify-between text-[10px] text-[#aaa5ad]" aria-hidden="true">
        <span>100</span>
        <span>80</span>
        <span>60</span>
        <span>40</span>
      </div>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-[190px] w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
        {[0, 20, 40, 60, 80, 100].map((score) => (
          <line
            key={score}
            x1={chart.left}
            x2={chart.width - chart.right}
            y1={yFor(score)}
            y2={yFor(score)}
            stroke="#eeebf0"
            strokeDasharray="3 5"
          />
        ))}
        <path d={`${path} L ${xFor(scores.length - 1)} ${chart.height - chart.bottom} L ${xFor(0)} ${chart.height - chart.bottom} Z`} fill="url(#score-fill)" />
        <defs>
          <linearGradient id="score-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b7a7d7" stopOpacity="0.23" />
            <stop offset="100%" stopColor="#b7a7d7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="#7963a6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {scores.map((point, index) => (
          <circle key={point.week} cx={xFor(index)} cy={yFor(point.score)} r={index === scores.length - 1 ? 5 : 3.5} fill={index === scores.length - 1 ? '#7963a6' : '#fff'} stroke="#7963a6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ))}
        {scores.map((point, index) => (
          <text key={point.week} x={xFor(index)} y={chart.height - 4} textAnchor="middle" fill="#96919d" fontSize="10" fontFamily="inherit">
            {point.week.replace('May ', 'May ').replace('Apr ', 'Apr ')}
          </text>
        ))}
      </svg>
    </div>
  )
}
