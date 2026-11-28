'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import type { FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision'
import { resetBodyTracking, sampleBodyFrame, sampleCameraFrame, type CameraSamples } from '@/lib/camera-feedback'
import type { VoiceSamples } from '@/lib/presentation-feedback'
import type { Language } from './copy'

export function CameraFeedback({ preview, samples, language, paused, voice }: {
  preview: RefObject<HTMLVideoElement | null>
  samples: CameraSamples
  language: Language
  paused: boolean
  voice?: VoiceSamples
}) {
  const ar = language === 'ar'
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const poseLandmarker = useRef<PoseLandmarker | null>(null)
  const landmarker = useRef<FaceLandmarker | null>(null)

  useEffect(() => {
    let closed = false
    async function loadModel() {
      try {
        const { FaceLandmarker, FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
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
          const pose = await PoseLandmarker.createFromOptions(files, {
            baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' },
            runningMode: 'VIDEO',
            numPoses: 1,
          }).catch(() => null)
          if (closed) pose?.close()
          else poseLandmarker.current = pose
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
      poseLandmarker.current?.close()
      poseLandmarker.current = null
    }
  }, [])

  useEffect(() => {
    if (status !== 'ready' || paused) return
    let previousFrame = -1
    let previousPoseSample = -Infinity
    const timer = window.setInterval(() => {
      const video = preview.current
      const detector = landmarker.current
      if (!detector || !video || video.readyState < 2 || video.currentTime === previousFrame) return
      previousFrame = video.currentTime
      try {
        const now = performance.now()
        sampleCameraFrame(samples, detector.detectForVideo(video, now).faceLandmarks[0])
        if (poseLandmarker.current && now - previousPoseSample >= 500) {
          previousPoseSample = now
          try {
            const speaking = now - (voice?.lastVoicedAt ?? -Infinity) < 450
            sampleBodyFrame(samples, poseLandmarker.current.detectForVideo(video, now).landmarks[0], speaking, now)
          } catch {
            poseLandmarker.current.close()
            poseLandmarker.current = null
          }
        }
      } catch {
        setStatus('unavailable')
      }
    }, 250)
    return () => {
      window.clearInterval(timer)
      samples.turnedFrames = 0
      resetBodyTracking(samples)
    }
  }, [paused, preview, samples, status, voice])

  if (status === 'ready') return null
  return (
    <p role="status" className="absolute end-4 bottom-28 rounded-lg bg-black/85 px-3 py-2 text-sm">
      {status === 'loading'
        ? (ar ? 'جاري تجهيز تحليل الكاميرا…' : 'Loading camera feedback…')
        : (ar ? 'تعذّر تشغيل تحليل الكاميرا. يمكنك متابعة التدريب.' : 'Camera feedback is unavailable. You can continue practicing.')}
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
      {samples.bodySamples >= 8 && (
        <div className="mt-3 space-y-1 text-sm">
          <h3 className="font-semibold">{ar ? 'لغة الجسد والإطار' : 'Body language and framing'}</h3>
          <p>{ar ? 'ظهور الكتفين معًا' : 'Both shoulders visible'} · <bdi>{Math.round(100 * samples.shouldersVisible / samples.bodySamples)}%</bdi></p>
          <p>{ar ? 'ظهور يد واحدة على الأقل' : 'At least one hand visible'} · <bdi>{Math.round(100 * samples.handsVisible / samples.bodySamples)}%</bdi></p>
          {samples.sustainedTilts > 0 && <p>{ar ? 'ظهر ميل جانبي مستمر للكتفين في بعض العينات. جرّب إعادة الجلوس أو الوقوف بمنتصف الإطار.' : 'Your shoulders tilted to one side for some sustained periods. Try resetting your position near the center of the frame.'}</p>}
          {samples.speakingHandSamples >= 6 && (
            <p>{ar ? 'حركات يد ملحوظة بالتزامن مع الصوت' : 'Noticeable hand movements during voiced speech'} · <bdi>{samples.speakingGestures}</bdi></p>
          )}
          {samples.handsVisible < samples.bodySamples / 3 && <p>{ar ? 'إذا كنت تستخدم الإيماءات للشرح، وسّع الإطار حتى تظهر يداك.' : 'If you use gestures to explain a point, widen the frame so your hands can be seen.'}</p>}
        </div>
      )}
      {available && <p className="mt-3 text-xs text-slate-500">{ar ? 'مؤشر تقديري لظهور الوجه، وليس قياسًا للتواصل البصري أو الثقة.' : 'Estimated face visibility, not a measure of eye contact or confidence.'}{previous && previous.total >= 8 ? ' · ' + (ar ? 'المحاولة السابقة: ' : 'Previous attempt: ') + percentage(previous) + '%' : ''}</p>}
    </section>
  )
}
