'use client'

import { useEffect } from 'react'
import { presentationCoverage, sampleVoice, summarizePitch, type VoiceSamples } from '@/lib/presentation-feedback'
import type { Language } from './copy'

export function PresentationVoiceMonitor({ samples }: { samples: VoiceSamples }) {
  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | undefined
    let context: AudioContext | undefined
    let timer: number | undefined

    async function start() {
      try {
        const sourceStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) {
          sourceStream.getTracks().forEach((track) => track.stop())
          return
        }
        stream = sourceStream
        context = new AudioContext()
        const analyser = context.createAnalyser()
        analyser.fftSize = 2048
        context.createMediaStreamSource(stream).connect(analyser)
        await context.resume()
        if (cancelled) return
        const frame = new Float32Array(analyser.fftSize)
        const sampleRate = context.sampleRate
        timer = window.setInterval(() => {
          analyser.getFloatTimeDomainData(frame)
          sampleVoice(samples, frame, sampleRate)
        }, 250)
      } catch {
        stream?.getTracks().forEach((track) => track.stop())
      }
    }

    void start()
    return () => {
      cancelled = true
      window.clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
      if (context && context.state !== 'closed') void context.close().catch(() => {})
    }
  }, [samples])
  return null
}

export function PresentationFeedback({ transcript, slides, voice, language }: {
  transcript: string
  slides: string[]
  voice: VoiceSamples
  language: Language
}) {
  const ar = language === 'ar'
  const words = transcript.match(/[\p{L}\p{N}]+/gu)?.length ?? 0
  const coverage = presentationCoverage(transcript, slides)
  const covered = coverage.filter((slide) => slide.covered)
  const coverageUnclear = coverage.length > 0 && covered.length === 0
  const firstGap = coverage.find((slide) => !slide.covered)
  const example = /على سبيل المثال|مثلا|مثلًا|for example|for instance/iu.test(transcript)
  const pitch = summarizePitch(voice)
  const strong = words >= 15 && example && (!coverage.length || covered.length >= Math.ceil(coverage.length / 2))
  return (
    <section className="mt-4 space-y-3 border-t border-slate-200 pt-4 text-sm">
      <h3 className="text-base font-semibold">{ar ? 'تقييم شرح العرض' : 'Presentation explanation review'}</h3>
      {words < 15 ? (
        <p>{ar ? 'النص قصير للحكم على الشرح. اشرح الفكرة وادعمها بمثال.' : 'The transcript is too short to assess the explanation. Explain the idea and support it with an example.'}</p>
      ) : coverageUnclear ? (
        <p>{ar ? 'ما قدرنا نقيّم ارتباط الشرح بالشرائح من النص المتاح. جرّب تذكر المصطلح الرئيسي وتشرحه بكلماتك.' : 'The available transcript is insufficient to assess slide coverage. Try naming the main term and explaining it in your own words.'}</p>
      ) : (
        <p>{strong
          ? (ar ? 'الشرح جيد وفق المؤشرات المتاحة: قدّمت مثالًا وغطّيت جزءًا من النقاط القابلة للتحليل.' : 'The explanation looks strong on the available indicators: you introduced an example and addressed the detected content.')
          : (ar ? 'الشرح بحاجة إلى دعم أوضح. اربط الفكرة بمثال محدد واشرح كيف يدعمها.' : 'The explanation needs clearer support. Give a concrete example and explain how it supports the point.')}</p>
      )}
      {covered.length > 0 && words > 0 && (
        <p>{ar ? 'شرائح ظهرت مصطلحاتها في كلامك:' : 'Slides with terms detected in your speech:'} {covered.length}/{coverage.length}.
          {firstGap && <> {ar ? 'راجع تغطية الشريحة' : 'Review slide'} {firstGap.index} · <bdi>{firstGap.phrase}</bdi></>}
        </p>
      )}
      {coverageUnclear && words > 0 && <p className="text-slate-500">{ar ? 'اختلاف لغة الشرائح عن التفريغ أو كتابة المصطلحات بتهجئة مختلفة ممكن يمنع المطابقة.' : 'Different languages or spellings in slides and speech can prevent keyword matching.'}</p>}
      {!coverageUnclear && <p className="text-slate-500">{ar ? 'المؤشرات تقديرية وتعتمد على النص المتاح وتطابق المصطلحات.' : 'Estimates use the available transcript and keyword overlap.'}</p>}
      <h3 className="text-base font-semibold">{ar ? 'تنويع نبرة الصوت' : 'Vocal pitch variation'}</h3>
      <p>{pitch === null
        ? (ar ? 'لا توجد عينات صوت واضحة كفاية لقياس تنويع النبرة.' : 'There are too few clear audio samples to estimate pitch variation.')
        : pitch < 2.5
          ? (ar ? 'تغيّر طبقة الصوت كان محدودًا. جرّب تمييز الكلمات المهمة بتنويع النبرة.' : 'Pitch variation was limited. Try varying your pitch to emphasize key words.')
          : (ar ? 'ظهر تنوّع في طبقة الصوت أثناء الشرح.' : 'Your pitch varied across the sampled speech.')}</p>
    </section>
  )
}
