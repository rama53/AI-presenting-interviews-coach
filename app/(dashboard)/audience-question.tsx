'use client'

import { useEffect, useState } from 'react'
import { audienceAnswerTip } from '@/lib/transcript-analysis'
import { Button } from '@/components/ui/button'
import type { Language } from './copy'
import { usePracticeTranscript } from './use-practice-transcript'

const answerSeconds = 30

export function AudienceQuestion({ question, language, onClose }: {
  question: string
  language: Language
  onClose: () => void
}) {
  const ar = language === 'ar'
  const speech = usePracticeTranscript(language)
  const { stopMicrophone } = speech
  const [deadline, setDeadline] = useState<number | null>(null)
  const [seconds, setSeconds] = useState(answerSeconds)
  const [finished, setFinished] = useState(false)
  const [audioUnavailable, setAudioUnavailable] = useState(false)
  const speaking = 'speechSynthesis' in globalThis

  useEffect(() => () => {
    globalThis.speechSynthesis?.cancel()
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

  function readQuestion() {
    setAudioUnavailable(false)
    if (!speaking) {
      setAudioUnavailable(true)
      return
    }
    const voice = new SpeechSynthesisUtterance(question)
    voice.lang = ar ? 'ar' : 'en-US'
    voice.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted') setAudioUnavailable(true)
    }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(voice)
  }

  const active = deadline !== null && !finished
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4" aria-label={ar ? 'تحدّي الجمهور' : 'Audience challenge'}>
      <h3 className="font-semibold">{ar ? 'سؤال من الجمهور' : 'Audience question'}</h3>
      <p>{question}</p>
      {deadline === null && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={readQuestion}>{ar ? 'اسمعي السؤال' : 'Listen to the question'}</Button>
          <Button type="button" onClick={() => {
            window.speechSynthesis?.cancel()
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
      <Button type="button" variant="outline" onClick={onClose}>{ar ? 'إغلاق التحدّي' : 'Close challenge'}</Button>
    </section>
  )
}
