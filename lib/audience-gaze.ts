export const audienceZones = ['left', 'center', 'right'] as const
export type GazeZone = typeof audienceZones[number] | 'slides'
export type GazePoint = readonly [number, number, number, number]
export type GazeCalibration = Partial<Record<GazeZone, GazePoint>>
export type GazeCounts = Record<GazeZone | 'uncertain', number>

export function emptyGazeCounts(): GazeCounts {
  return { left: 0, center: 0, right: 0, slides: 0, uncertain: 0 }
}

export function gazeDistance(a: GazePoint, b: GazePoint) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3])
}

export function classifyGaze(point: GazePoint, calibration: GazeCalibration, slidesOpen: boolean): GazeZone | 'uncertain' {
  const candidates: GazeZone[] = slidesOpen ? [...audienceZones, 'slides'] : [...audienceZones]
  const ranked = candidates.flatMap((zone) => {
    const target = calibration[zone]
    return target ? [{ zone, distance: gazeDistance(point, target) }] : []
  }).sort((a, b) => a.distance - b.distance)

  const [best, other] = ranked
  if (!best || !other || best.distance > 0.22 || other.distance - best.distance < 0.025) return 'uncertain'
  return best.zone
}
