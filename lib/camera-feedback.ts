export type FacePoint = { x: number; y: number }
export type CameraSamples = {
  total: number
  visible: number
  turnedFrames: number
  sideTurns: number
  bodySamples: number
  shouldersVisible: number
  handsVisible: number
  speakingHandSamples: number
  speakingGestures: number
  tiltedFrames: number
  sustainedTilts: number
  lastWrists: [FacePoint | undefined, FacePoint | undefined]
  lastGestureAt: number
}

export function emptyCameraSamples(): CameraSamples {
  return { total: 0, visible: 0, turnedFrames: 0, sideTurns: 0, bodySamples: 0, shouldersVisible: 0, handsVisible: 0, speakingHandSamples: 0, speakingGestures: 0, tiltedFrames: 0, sustainedTilts: 0, lastWrists: [undefined, undefined], lastGestureAt: -Infinity }
}

export function sampleCameraFrame(samples: CameraSamples, face: FacePoint[] | undefined) {
  const nose = face?.[1]
  const leftEye = face?.[33]
  const rightEye = face?.[263]
  samples.total++

  const width = leftEye && rightEye ? Math.abs(rightEye.x - leftEye.x) : 0
  const withinFrame = [nose, leftEye, rightEye].every((point) =>
    point && point.x >= 0.02 && point.x <= 0.98 && point.y >= 0.02 && point.y <= 0.98
  )
  if (!nose || !leftEye || !rightEye || !withinFrame || width < 0.075) {
    samples.turnedFrames = 0
    return
  }

  samples.visible++
  const eyeMidpoint = (rightEye.x + leftEye.x) / 2
  const turned = Math.abs(nose.x - eyeMidpoint) / width > 0.27
  samples.turnedFrames = turned ? samples.turnedFrames + 1 : 0
  if (samples.turnedFrames === 6) samples.sideTurns++
}

export function resetBodyTracking(samples: CameraSamples) {
  samples.tiltedFrames = 0
  samples.lastWrists = [undefined, undefined]
}

export function sampleBodyFrame(samples: CameraSamples, pose?: (FacePoint & { visibility?: number })[], speaking = false, now = 0) {
  function inFrame(index: number) {
    const point = pose?.[index]
    if (point && (point.visibility ?? 0) >= 0.55 &&
      point.x >= 0.02 && point.x <= 0.98 && point.y >= 0.02 && point.y <= 0.98) return point
    return undefined
  }
  const left = inFrame(11)
  const right = inFrame(12)
  const wrists = [inFrame(15), inFrame(16)] as const
  samples.bodySamples++
  if (wrists.some(Boolean)) samples.handsVisible++
  if (!left || !right) {
    resetBodyTracking(samples)
    return
  }
  samples.shouldersVisible++
  const width = Math.hypot(right.x - left.x, right.y - left.y)
  if (width < 0.08) {
    resetBodyTracking(samples)
    return
  }

  const tilted = Math.abs(right.y - left.y) / width > 0.22
  samples.tiltedFrames = tilted ? samples.tiltedFrames + 1 : 0
  if (samples.tiltedFrames === 4) samples.sustainedTilts++

  const center = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 }
  const [leftWrist, rightWrist] = wrists.map((point) => point && ({
    x: (point.x - center.x) / width,
    y: (point.y - center.y) / width,
  }))
  const previous = samples.lastWrists
  const current = [leftWrist, rightWrist] as const
  samples.lastWrists = [leftWrist, rightWrist]
  if (!speaking || !current.some((point, index) => point && previous[index])) return

  samples.speakingHandSamples++
  const moving = current.some((point, index) => {
    const before = previous[index]
    return point && before && Math.hypot(point.x - before.x, point.y - before.y) > 0.24
  })
  if (moving && now - samples.lastGestureAt >= 1000) {
    samples.speakingGestures++
    samples.lastGestureAt = now
  }
}
