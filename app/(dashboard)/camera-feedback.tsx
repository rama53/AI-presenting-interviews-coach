'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import { sampleCameraFrame, type CameraSamples } from '@/lib/camera-feedback'
import type { Language } from './copy'

export function CameraFeedback({ preview, samples, language, paused }: {
  preview: RefObject<HTMLVideoElement | null>
  samples: CameraSamples
  language: Language
  paused: boolean
}) {
  const ar = language === 'ar'
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
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
    if (status !== 'ready' || paused) return
    let previousFrame = -1
    const timer = window.setInterval(() => {
      const video = preview.current
      const detector = landmarker.current
      if (!detector || !video || video.readyState < 2 || video.currentTime === previousFrame) return
      previousFrame = video.currentTime
      try {
        sampleCameraFrame(samples, detector.detectForVideo(video, performance.now()).faceLandmarks[0])
      } catch {
        setStatus('unavailable')
      }
    }, 250)
    return () => {
      window.clearInterval(timer)
      samples.turnedFrames = 0
    }
  }, [paused, preview, samples, status])

  if (status === 'ready') return null
  return (
    <p role="status" className="absolute end-4 bottom-28 rounded-lg bg-black/85 px-3 py-2 text-sm">
      {status === 'loading'
        ? (ar ? 'جاري تجهيز تحليل الكاميرا…' : 'Loading camera feedback…')
        : (ar ? 'تعذّر تشغيل تحليل الكاميرا. تقدري تكمّلي العرض.' : 'Camera feedback is unavailable. You can keep presenting.')}
    </p>
  )
}

export function CameraFeedbackReport({ samples, previous, language }: {
  samples: CameraSamples
  previous: CameraSamples | null
  language: Language
}) {
  const ar = language === 'ar'
  const percentage = (data: CameraSamples) => Math.round(100 * data.visible / data.total)
  return (
    <section className="mt-5 space-y-2 rounded-xl border border-border bg-background p-4">
      <h2 className="font-semibold">{ar ? 'ملاحظات الكاميرا' : 'Camera feedback'}</h2>
      {samples.total < 8 ? (
        <p className="text-sm">{ar ? 'ما في عينات كاميرا كافية من هالمحاولة.' : 'There are too few camera samples from this attempt.'}</p>
      ) : (
        <>
          <p className="text-sm">{ar ? 'ظهر وجهك بوضوح في' : 'Your face was detected clearly in'} <bdi>{percentage(samples)}%</bdi> {ar ? 'من عينات الكاميرا.' : 'of the camera samples.'}</p>
          {previous && previous.total >= 8 && <p className="text-sm">{ar ? 'بالمحاولة السابقة' : 'Previous attempt'} · <bdi>{percentage(previous)}%</bdi></p>}
          {samples.sideTurns > 0 && (
            <p className="text-sm">{ar ? 'التفاتات جانبية مستمرة رصدتها الكاميرا' : 'Sustained sideways head turns detected'} · {samples.sideTurns}</p>
          )}
          <p className="text-sm text-muted-foreground">{ar ? 'الملاحظات تقديرية. النظر لتحت باتجاه الشاشة ما بينحسب التفات جانبي.' : 'These are estimates. Looking down toward the screen does not count as a sideways turn.'}</p>
        </>
      )}
    </section>
  )
}
