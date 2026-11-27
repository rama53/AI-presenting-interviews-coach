'use client'

import { useEffect, useRef, useState } from 'react'
import { audienceAnswerTip, type buildAudienceQuestion } from '@/lib/transcript-analysis'
import { Button } from '@/components/ui/button'
import type { Language } from './copy'
import { usePracticeTranscript } from './use-practice-transcript'

const answerSeconds = 30
const audienceApi = process.env.NEXT_PUBLIC_AUDIENCE_API_URL?.replace(/\/$/, '')

export function AudienceQuestion({ question, transcript, presentationTopic, language, onClose, onFinish }: {
  question: ReturnType<typeof buildAudienceQuestion>
  transcript: string
  presentationTopic: string
  language: Language
  onClose: () => void
  onFinish: () => void
}) {
  const ar = language === 'ar'
  const speech = usePracticeTranscript(language)
  const { stopMicrophone } = speech
  const [deadline, setDeadline] = useState<number | null>(null)
  const [seconds, setSeconds] = useState(answerSeconds)
  const [finished, setFinished] = useState(false)
  const [sourceText, setSourceText] = useState(() => transcript.slice(0, 16000))
  const [generated, setGenerated] = useState<{ question: string; audioBase64: string } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generationFailed, setGenerationFailed] = useState(false)
  const request = useRef<AbortController | null>(null)
  const [audioUnavailable, setAudioUnavailable] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const audio = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const room = dialog.current
    const player = audio.current
    room?.showModal()
    if (!audienceApi) void player?.play().catch(() => {})
    return () => {
      request.current?.abort()
      player?.pause()
      room?.close()
    }
  }, [])

  useEffect(() => {
    if (deadline === null || finished) return
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSeconds(remaining)
      if (remaining === 0) {
        stopMicrophone()
        setFinished(true)
      }
    }, 200)
    return () => window.clearInterval(timer)
  }, [deadline, finished, stopMicrophone])

  async function readQuestion() {
    if (!audio.current) return
    setAudioUnavailable(false)
    audio.current.currentTime = 0
    try {
      await audio.current.play()
    } catch {
      setAudioUnavailable(true)
    }
  }

  async function generateQuestion() {
    if (!audienceApi || request.current || !sourceText.trim()) return
    const controller = new AbortController()
    request.current = controller
    setGenerating(true)
    setGenerationFailed(false)
    setAudioUnavailable(false)
    audio.current?.pause()
    try {
      const response = await fetch(`${audienceApi}/audience-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(35000)]),
        body: JSON.stringify({ transcript: sourceText, topic: presentationTopic, language }),
      })
      if (!response.ok) throw new Error('Question generation failed')
      const result = await response.json()
      if (typeof result.question !== 'string' || typeof result.audioBase64 !== 'string' || !result.audioBase64) {
        throw new Error('Invalid question response')
      }
      setGenerated(result)
    } catch {
      if (!controller.signal.aborted) setGenerationFailed(true)
    } finally {
      request.current = null
      if (!controller.signal.aborted) setGenerating(false)
    }
  }

  const active = deadline !== null && !finished
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[min(92vw,34rem)] space-y-3 overflow-auto rounded-xl border border-border bg-card p-5 text-foreground backdrop:bg-black/60"
      aria-label={ar ? 'تحدّي الجمهور' : 'Audience challenge'}
    >
      <h3 className="font-semibold">{ar ? 'سؤال من الجمهور' : 'Audience question'}</h3>
      {audienceApi && deadline === null && !generated && (
        <div className="space-y-2">
          <label className="block">
            {ar ? 'نص العرض أو ملخّصه' : 'Presentation transcript or summary'}
            <textarea className="mt-1 block w-full rounded-lg border border-input bg-background p-2" dir="auto" rows={3} maxLength={16000} disabled={generating} value={sourceText} onChange={(event) => setSourceText(event.target.value)} />
          </label>
          <p className="text-sm text-muted-foreground">{ar ? 'سيُرسل النص إلى خدمة الذكاء الاصطناعي لتوليد السؤال والصوت.' : 'The text will be sent to an AI service to generate the question and its audio.'}</p>
          <Button type="button" disabled={generating || !sourceText.trim()} onClick={generateQuestion}>
            {generating ? (ar ? 'جاري تحضير السؤال…' : 'Preparing the question…') : (ar ? 'ولّدي سؤالًا من عرضي' : 'Generate a question from my talk')}
          </Button>
          {generationFailed && <p role="status">{ar ? 'تعذّر توليد سؤال. جرّبي مرة ثانية أو استخدمي السؤال الجاهز.' : 'We could not generate a question. Retry or use the prepared question.'}</p>}
        </div>
      )}
      <p>{generated?.question ?? question.text}</p>
      {generated && <p className="text-sm text-muted-foreground">{ar ? 'صوت مولّد بالذكاء الاصطناعي' : 'AI-generated voice'}</p>}
      <audio ref={audio} preload="auto" src={generated ? `data:audio/mpeg;base64,${generated.audioBase64}` : `${process.env.NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH ?? ''}/audience-audio/${question.audio}`} />
      {deadline === null && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={generating} onClick={readQuestion}>{ar ? 'اسمعي السؤال' : 'Listen to the question'}</Button>
          <Button type="button" disabled={generating} onClick={() => {
            audio.current?.pause()
            setDeadline(Date.now() + answerSeconds * 1000)
          }}>{ar ? 'ابدئي الإجابة · ٣٠ ثانية' : 'Start your answer · 30 seconds'}</Button>
        </div>
      )}
      {audioUnavailable && <p role="status">{ar ? 'الصوت غير متاح على هالجهاز. اقرئي السؤال المكتوب.' : 'Audio is unavailable on this device. Read the question above.'}</p>}
      {deadline !== null && (
        <>
          {active && <p role="timer">{ar ? 'الوقت المتبقي' : 'Time remaining'} · {seconds}</p>}
          <label className="block">
            {ar ? 'جوابك للجمهور' : 'Your answer to the audience'}
            <textarea className="mt-1 block w-full rounded-lg border border-input bg-background p-2" dir="auto" rows={3} readOnly={finished} value={speech.transcript} onChange={(event) => speech.setTranscript(event.target.value)} />
          </label>
          {active && (
            <>
              <p className="text-muted-foreground">{ar ? 'قد يرسل المتصفح الصوت إلى خدمة تحويل الكلام إلى نص.' : 'Your browser may send audio to a speech recognition service.'}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={speech.status === 'stopping'} onClick={speech.busy ? stopMicrophone : speech.startMicrophone}>
                  {speech.busy ? (ar ? 'إيقاف المايك' : 'Stop microphone') : (ar ? 'المايك' : 'Mic')}
                </Button>
                <Button type="button" onClick={() => {
                  stopMicrophone()
                  setFinished(true)
                }}>{ar ? 'إنهاء الإجابة' : 'Finish answer'}</Button>
              </div>
            </>
          )}
          {(speech.status === 'unavailable' || speech.status === 'error') && <p role="status">{ar ? 'تعذّر تحويل الصوت إلى نص. تقدري تكتبي جوابك.' : 'Speech recognition failed. You can type your answer.'}</p>}
          {finished && <p role="status">{audienceAnswerTip(speech.transcript, language)}</p>}
        </>
      )}
      {finished && <Button type="button" onClick={onFinish}>{ar ? 'إنهاء التدريب' : 'End practice'}</Button>}
      <Button type="button" variant="outline" onClick={onClose}>{ar ? 'الرجوع للعرض' : 'Back to presentation'}</Button>
    </dialog>
  )
}
