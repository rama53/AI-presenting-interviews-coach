export type PerformanceChartData = {
  camera: { total: number; visible: number }
  questions?: boolean[] | null
}

export function chartPercentages(counts: number[]) {
  const total = counts.reduce((sum, count) => sum + count, 0)
  if (total === 0) return counts.map(() => 0)
  const shares = counts.map(count => 100 * count / total)
  const rounded = shares.map(Math.floor)
  const remaining = 100 - rounded.reduce((sum, count) => sum + count, 0)
  const order = shares.map((share, index) => ({ index, remainder: share - rounded[index] }))
    .sort((a, b) => b.remainder - a.remainder)
  order.slice(0, remaining).forEach(({ index }) => { rounded[index]++ })
  return rounded
}
