'use client'

import { useEffect, useRef, useState } from 'react'
import { audienceAnswerTip } from '@/lib/transcript-analysis'
import { Button } from '@/components/ui/button'
import type { Language } from './copy'
import { usePracticeTranscript } from './use-practice-transcript'

const answerSeconds = 30

export function AudienceQuestion({ question, language, onClose, onFinish }: {
  question: { text: string; audio: string | null }
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
  const [audioUnavailable, setAudioUnavailable] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const audio = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const room = dialog.current
    const player = audio.current
    room?.showModal()
    void player?.play().catch(() => {})
    return () => {
      player?.pause()
      if (!player) window.speechSynthesis?.cancel()
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
    setAudioUnavailable(false)
    if (!audio.current) {
      const synth = window.speechSynthesis
      if (!synth) { setAudioUnavailable(true); return }
      const utterance = new SpeechSynthesisUtterance(question.text)
      utterance.lang = ar ? 'ar' : 'en-US'
      utterance.rate = 0.9
      utterance.onerror = (event) => {
        if (event.error !== 'canceled' && event.error !== 'interrupted') setAudioUnavailable(true)
      }
      synth.cancel()
      synth.speak(utterance)
      return
    }
    audio.current.currentTime = 0
    try {
      await audio.current.play()
    } catch {
      setAudioUnavailable(true)
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
      <p>{question.text}</p>
      {question.audio && <audio ref={audio} preload="auto" src={`${process.env.NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH ?? ''}/audience-audio/${question.audio}`} />}
      {deadline === null && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={readQuestion}>{ar ? 'استماع إلى السؤال' : 'Listen to the question'}</Button>
          <Button type="button" onClick={() => {
            audio.current?.pause()
            if (!question.audio) window.speechSynthesis?.cancel()
            setDeadline(Date.now() + answerSeconds * 1000)
          }}>{ar ? 'بدء الإجابة · ٣٠ ثانية' : 'Start your answer · 30 seconds'}</Button>
        </div>
      )}
      {audioUnavailable && <p role="status">{ar ? 'الصوت غير متاح على هالجهاز. يمكن قراءة السؤال المكتوب.' : 'Audio is unavailable on this device. Read the question above.'}</p>}
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
          {(speech.status === 'unavailable' || speech.status === 'error') && <p role="status">{ar ? 'تعذّر تحويل الصوت إلى نص. يمكنك كتابة جوابك.' : 'Speech recognition failed. You can type your answer.'}</p>}
          {finished && <p role="status">{audienceAnswerTip(speech.transcript, language)}</p>}
        </>
      )}
      {finished && <Button type="button" onClick={onFinish}>{ar ? 'إنهاء التدريب' : 'End practice'}</Button>}
      <Button type="button" variant="outline" onClick={onClose}>{ar ? 'الرجوع للعرض' : 'Back to presentation'}</Button>
    </dialog>
  )
}
