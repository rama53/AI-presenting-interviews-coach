'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision'
import { audienceZones, classifyGaze, gazeDistance, type GazeCalibration, type GazeCounts, type GazePoint, type GazeZone } from '@/lib/audience-gaze'
import type { Language } from './copy'

const zoneLabels = {
  ar: { left: 'يسار الجمهور', center: 'وسط الجمهور', right: 'يمين الجمهور', slides: 'الشرائح', uncertain: 'غير واضح' },
  en: { left: 'Audience left', center: 'Audience center', right: 'Audience right', slides: 'Slides', uncertain: 'Unclear' },
}

function facePoint(face: NormalizedLandmark[]): GazePoint | null {
  const [nose, leftOuter, leftInner, rightOuter, rightInner, leftIris, rightIris] = [1, 33, 133, 263, 362, 468, 473].map((index) => face[index])
  if (!nose || !leftOuter || !leftInner || !rightOuter || !rightInner || !leftIris || !rightIris) return null
  const width = Math.abs(rightOuter.x - leftOuter.x)
  if (width < 0.075 || Math.min(leftOuter.x, rightOuter.x) < 0.02 || Math.max(leftOuter.x, rightOuter.x) > 0.98) return null
  const eyeX = (leftOuter.x + leftInner.x + rightOuter.x + rightInner.x) / 4
  const eyeY = (leftOuter.y + leftInner.y + rightOuter.y + rightInner.y) / 4
  return [
    (nose.x - eyeX) / width,
    (nose.y - eyeY) / width,
    2 * ((leftIris.x + rightIris.x) / 2 - eyeX) / width,
    2 * ((leftIris.y + rightIris.y) / 2 - eyeY) / width,
  ]
}

export function AudienceGaze({ preview, calibration, counts, language, paused, slidesOpen }: {
  preview: RefObject<HTMLVideoElement | null>
  calibration: GazeCalibration
  counts: GazeCounts
  language: Language
  paused: boolean
  slidesOpen: boolean
}) {
  const ar = language === 'ar'
  const labels = zoneLabels[language]
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [nextZone, setNextZone] = useState<GazeZone | null>(null)
  const [calibrationMessage, setCalibrationMessage] = useState('')
  const [calibrated, setCalibrated] = useState(() => audienceZones.every((zone) => calibration[zone]))
  const capture = useRef<{ zone: GazeZone; points: GazePoint[]; start: number } | null>(null)
  const landmarker = useRef<FaceLandmarker | null>(null)

  useEffect(() => {
    let closed = false
    async function loadModel() {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const files = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm')
        if (closed) return
        const detector = await FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task' },
          runningMode: 'VIDEO',
          numFaces: 1,
        })
        if (closed) detector.close()
        else {
          landmarker.current = detector
          setStatus('ready')
        }
      } catch {
        if (!closed) setStatus('unavailable')
      }
    }
    void loadModel()
    return () => {
      closed = true
      landmarker.current?.close()
      landmarker.current = null
    }
  }, [])

  useEffect(() => {
    if (paused || (!slidesOpen && capture.current?.zone === 'slides')) {
      capture.current = null
      setCalibrationMessage('')
    }
    if (status !== 'ready' || paused) return
    let previousFrame = -1
    const timer = window.setInterval(() => {
      const sample = capture.current
      if (sample && performance.now() - sample.start > 2200) {
        capture.current = null
        setCalibrationMessage(ar ? 'الوجه مش واضح كفاية. عدّلي مكانك وجرّبي هالجهة مرة ثانية.' : 'Face not clear enough. Move closer and try again.')
      }
      const video = preview.current
      const detector = landmarker.current
      if (!detector || !video || video.readyState < 2 || video.currentTime === previousFrame) return
      previousFrame = video.currentTime
      try {
        const points = detector.detectForVideo(video, performance.now()).faceLandmarks[0]
        const point = points ? facePoint(points) : null
        const pending = capture.current
        if (pending && (pending.zone !== 'slides' || slidesOpen)) {
          if (!point || performance.now() < pending.start + 450) return
          pending.points.push(point)
          if (pending.points.length < 3) return
          const sum = pending.points.reduce<[number, number, number, number]>((sum, item) => [
            sum[0] + item[0], sum[1] + item[1], sum[2] + item[2], sum[3] + item[3],
          ], [0, 0, 0, 0])
          const [x, y, eyeX, eyeY] = sum.map((value) => value / pending.points.length)
          const average: GazePoint = [x, y, eyeX, eyeY]
          const overlap = Object.entries(calibration).some(([zone, target]) => zone !== pending.zone && gazeDistance(target, average) < 0.045)
          capture.current = null
          if (overlap) {
            setCalibrationMessage(ar ? 'الجهة قريبة من نقطة سابقة. حرّكي نظرك ورأسك شوي وحاولي مرة ثانية.' : 'This target is too close to a previous one. Turn slightly and retry.')
            return
          }
          calibration[pending.zone] = average
          setCalibrationMessage('')
          const next = audienceZones.find((zone) => !calibration[zone]) ?? null
          setNextZone(next)
          setCalibrated(next === null)
          if (next) capture.current = { zone: next, points: [], start: performance.now() }
          return
        }
        if (calibrated) counts[point ? classifyGaze(point, calibration, slidesOpen) : 'uncertain']++
      } catch {
        setStatus('unavailable')
      }
    }, 180)
    return () => window.clearInterval(timer)
  }, [ar, calibrated, calibration, counts, paused, preview, slidesOpen, status])

  function startCalibration() {
    for (const zone of [...audienceZones, 'slides'] as const) delete calibration[zone]
    Object.assign(counts, { left: 0, center: 0, right: 0, slides: 0, uncertain: 0 })
    setCalibrated(false)
    setNextZone('left')
    captureZone('left')
  }

  function captureZone(zone: GazeZone) {
    capture.current = { zone, points: [], start: performance.now() }
    setCalibrationMessage(ar ? 'اتبعي النقطة بنظرك. رح تنتقل لحالها.' : 'Follow the dot as it moves on its own.')
  }

  return (
    <>
      {nextZone && (
        <div aria-hidden="true" className={`pointer-events-none absolute top-[52%] z-10 -translate-x-1/2 rounded-full border-4 border-white bg-amber-300 p-2 shadow-xl ${nextZone === 'left' ? 'left-[22%]' : nextZone === 'right' ? 'left-[78%]' : 'left-1/2'}`} />
      )}
    <aside className="absolute start-4 top-24 z-10 max-w-[min(75vw,21rem)] space-y-2 rounded-xl bg-black/85 p-3 text-sm text-white">
      <h2 className="font-semibold">{ar ? 'اتجاه النظر' : 'Gaze direction'}</h2>
      {status !== 'ready' ? (
        <p role="status">{status === 'loading' ? (ar ? 'جاري تجهيز تحليل الكاميرا…' : 'Loading camera analysis…') : (ar ? 'تعذّر تشغيل تحليل الكاميرا.' : 'Camera analysis is unavailable.')}</p>
      ) : (
        <>
          {nextZone && (
            <div className="space-y-2">
              <p>{ar ? 'اطلعي باتجاه' : 'Look toward'} <strong>{labels[nextZone]}</strong></p>
              {!capture.current && (
                <button type="button" disabled={paused} className="rounded-lg bg-white/15 px-3 py-2 disabled:opacity-50" onClick={() => captureZone(nextZone)}>
                  {ar ? 'أعيدي هالجهة' : 'Retry this direction'}
                </button>
              )}
              <button type="button" className="ms-2 rounded-lg px-3 py-2 hover:bg-white/15" onClick={() => {
                capture.current = null
                setNextZone(null)
                setCalibrationMessage('')
              }}>{ar ? 'كمّلي بدون معايرة' : 'Continue without calibration'}</button>
            </div>
          )}
          {nextZone === null && (
            <button type="button" disabled={paused} className="rounded-lg bg-white/15 px-3 py-2 disabled:opacity-50" onClick={startCalibration}>
              {calibrated ? (ar ? 'إعادة المعايرة' : 'Recalibrate') : (ar ? 'معايرة جهات الجمهور' : 'Calibrate audience zones')}
            </button>
          )}
          {calibrated && slidesOpen && (
            <button type="button" disabled={paused} className="ms-2 rounded-lg bg-white/15 px-3 py-2 disabled:opacity-50" onClick={() => captureZone('slides')}>
              {ar ? 'اطلعي على الشريحة وثبّتي اتجاهها' : 'Look at the slide and capture its direction'}
            </button>
          )}
          {calibrationMessage && <p role="status">{calibrationMessage}</p>}
        </>
      )}
    </aside>
    </>
  )
}

export function AudienceGazeReport({ counts, previous, language }: { counts: GazeCounts; previous: GazeCounts | null; language: Language }) {
  const ar = language === 'ar'
  const labels = zoneLabels[language]
  const zones = [...audienceZones, 'slides', 'uncertain'] as const
  const total = zones.reduce((sum, zone) => sum + counts[zone], 0)
  const previousTotal = previous ? zones.reduce((sum, zone) => sum + previous[zone], 0) : 0
  const enough = total - counts.uncertain >= 8
  return (
    <section className="mt-5 space-y-2 rounded-xl border border-border bg-background p-4">
      <h2 className="font-semibold">{ar ? 'توزيع النظر' : 'Gaze distribution'}</h2>
      {enough ? (
        <>
          <p className="text-sm text-muted-foreground">{ar ? 'تقدير من عينات الكاميرا بعد المعايرة. اتجاه النظر للشرائح ممكن يعني مراجعتها.' : 'Estimate from calibrated camera samples. Looking toward the slides may indicate a glance.'}</p>
          <table className="w-full text-start text-sm">
            <thead><tr><th className="text-start">{ar ? 'الجهة' : 'Zone'}</th>{previous && previousTotal - previous.uncertain >= 8 && <th>{ar ? 'السابقة' : 'Previous'}</th>}<th>{ar ? 'الحالية' : 'Current'}</th></tr></thead>
            <tbody>{zones.map((zone) => <tr key={zone}><th scope="row" className="py-1 text-start font-medium">{labels[zone]}</th>{previous && previousTotal - previous.uncertain >= 8 && <td className="text-center">{Math.round(100 * previous[zone] / previousTotal)}%</td>}<td className="text-center">{Math.round(100 * counts[zone] / total)}%</td></tr>)}</tbody>
          </table>
        </>
      ) : <p className="text-sm">{ar ? 'ما في عينات واضحة كفاية. شغّلي الكاميرا وعايري جهات الجمهور قبل ما تكمّلي العرض.' : 'Too few clear samples. Turn on the camera and calibrate the audience zones before continuing.'}</p>}
    </section>
  )
}
