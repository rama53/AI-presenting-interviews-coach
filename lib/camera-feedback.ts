export type FacePoint = { x: number; y: number }
export type CameraSamples = {
  total: number
  visible: number
  turnedFrames: number
  sideTurns: number
  bodySamples: number
  shouldersVisible: number
  handsVisible: number
}

export function emptyCameraSamples(): CameraSamples {
  return { total: 0, visible: 0, turnedFrames: 0, sideTurns: 0, bodySamples: 0, shouldersVisible: 0, handsVisible: 0 }
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

export function sampleBodyFrame(samples: CameraSamples, pose?: (FacePoint & { visibility?: number })[]) {
  function visible(index: number) {
    const point = pose?.[index]
    return Boolean(point && (point.visibility ?? 0) >= 0.55 &&
      point.x >= 0.02 && point.x <= 0.98 && point.y >= 0.02 && point.y <= 0.98)
  }
  samples.bodySamples++
  if (visible(11) && visible(12)) samples.shouldersVisible++
  if (visible(15) || visible(16)) samples.handsVisible++
}
