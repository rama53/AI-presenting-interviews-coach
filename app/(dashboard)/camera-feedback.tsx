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
        : (ar ? 'تعذّر تشغيل تحليل الكاميرا. يمكنك متابعة العرض.' : 'Camera feedback is unavailable. You can keep presenting.')}
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
  const available = samples.total >= 8
  const percent = available ? percentage(samples) : 0
  return (
    <section className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FCD4A5] text-[#AD632D]"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/></svg></div>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-semibold text-[#182D43]">{ar ? 'الحضور أمام الكاميرا' : 'Camera presence'}</h2>
          {available ? <><p className="text-sm text-slate-500">{ar ? 'ظهور الوجه في عينات الكاميرا' : 'Face visibility in camera samples'}</p><div className="h-2.5 overflow-hidden rounded-full bg-[#E9EDE8]"><div className="h-full rounded-full bg-[#29966B]" style={{width: percent + '%'}}/></div><p className="text-sm text-slate-500">{samples.sideTurns} {ar ? 'التفاتات جانبية مستمرة' : 'sustained sideways head turns'}</p></> : <p className="text-sm text-slate-500">{ar ? 'لا توجد عينات كاميرا كافية.' : 'Not enough camera samples.'}</p>}
        </div>
        {available && <svg className="h-20 w-20 shrink-0" viewBox="0 0 80 80" role="img" aria-label={percent + '%'}><circle cx="40" cy="40" r="32" fill="none" stroke="#E9EDE8" strokeWidth="7"/><circle cx="40" cy="40" r="32" fill="none" stroke="#29966B" strokeWidth="7" strokeDasharray={percent * 2.0106 + ' 201.06'} strokeLinecap="round" transform="rotate(-90 40 40)"/><text x="40" y="45" fontSize="18" fontWeight="bold" fill="#182D43" textAnchor="middle">{percent}%</text></svg>}
      </div>
      {available && <p className="mt-3 text-xs text-slate-500">{ar ? 'مؤشر تقديري لظهور الوجه، وليس قياسًا للتواصل البصري أو الثقة.' : 'Estimated face visibility, not a measure of eye contact or confidence.'}{previous && previous.total >= 8 ? ' · ' + (ar ? 'المحاولة السابقة: ' : 'Previous attempt: ') + percentage(previous) + '%' : ''}</p>}
    </section>
  )
}
