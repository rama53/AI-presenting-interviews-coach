'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { analyzeTranscript, type AnalysisMode } from '@/lib/transcript-analysis'
import type { Language } from './copy'

type RecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

type Recognition = {
  lang: string
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition
  webkitSpeechRecognition?: new () => Recognition
}

const labels = {
  ar: {
    title: 'تحليل التدريب',
    transcript: 'نص الإجابة أو العرض',
    start: 'تحويل الصوت إلى نص',
    stop: 'إيقاف المايك',
    listening: 'المايك شغّال…',
    privacy: 'قد يرسل المتصفح الصوت لخدمة التعرّف على الكلام. بإمكانك تكتبي النص يدويًا.',
    unavailable: 'التعرّف على الكلام غير متاح. اكتبي النص يدويًا.',
    error: 'تعذّر تحويل الصوت إلى نص. جرّبي مرة ثانية أو اكتبي النص يدويًا.',
    analyze: 'حلّل النص',
    followUp: 'سؤال متابعة',
    notes: 'ملاحظات مبنية على النص',
    words: 'عدد الكلمات',
  },
  en: {
    title: 'Practice analysis',
    transcript: 'Answer or presentation transcript',
    start: 'Transcribe speech',
    stop: 'Stop microphone',
    listening: 'Listening…',
    privacy: 'Your browser may send audio to a speech recognition service. You can type your transcript instead.',
    unavailable: 'Speech recognition is unavailable. You can type your transcript.',
    error: 'Could not transcribe speech. Try again or type your transcript.',
    analyze: 'Analyze text',
    followUp: 'Follow-up question',
    notes: 'Text-based feedback',
    words: 'Word count',
  },
}

export function PracticeAnalysis({ language, mode, running }: {
  language: Language
  mode: AnalysisMode
  running: boolean
}) {
  const text = labels[language]
  const [transcript, setTranscript] = useState('')
  const [showAnalysis, setShowAnalysis] = useState(false)
  const result = showAnalysis ? analyzeTranscript({ transcript, language, mode }) : null
  const [status, setStatus] = useState<'idle' | 'listening' | 'stopping' | 'unavailable' | 'error'>('idle')
  const microphone = useRef<Recognition | null>(null)
  const busy = status === 'listening' || status === 'stopping'

  useEffect(() => {
    if (!running && microphone.current) {
      const active = microphone.current
      microphone.current = null
      active.abort()
    }
  }, [running])

  useEffect(() => () => {
    const active = microphone.current
    microphone.current = null
    active?.abort()
  }, [])

  function startMicrophone() {
    if (microphone.current) return
    const browser = window as SpeechWindow
    const SpeechRecognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setStatus('unavailable')
      return
    }

    const recognition = new SpeechRecognition()
    microphone.current = recognition
    recognition.lang = language === 'ar' ? 'ar-PS' : 'en-US'
    recognition.onresult = (event) => {
      if (microphone.current !== recognition) return
      const spoken = Array.from(event.results, (entry) => entry[0].transcript).join(' ').trim()
      if (!spoken) return
      setTranscript((previous) => [previous.trim(), spoken].filter(Boolean).join(' '))
      setShowAnalysis(false)
    }
    recognition.onerror = () => {
      if (microphone.current === recognition) setStatus('error')
    }
    recognition.onend = () => {
      if (microphone.current !== recognition) return
      microphone.current = null
      setStatus((previous) => previous === 'error' ? previous : 'idle')
    }
    try {
      recognition.start()
      setStatus('listening')
    } catch {
      microphone.current = null
      setStatus('error')
    }
  }

  function stopMicrophone() {
    setStatus('stopping')
    microphone.current?.stop()
  }

  return (
    <section className="mt-5 space-y-3 rounded-xl border border-border bg-background p-4">
      <h2 className="font-semibold">{text.title}</h2>
      <label className="block text-sm font-medium">
        {text.transcript}
        <textarea
          className="mt-1 block w-full rounded-lg border border-input bg-card p-2"
          dir="auto"
          rows={4}
          value={transcript}
          onChange={(event) => {
            setTranscript(event.target.value)
            setShowAnalysis(false)
          }}
        />
      </label>
      {running && (
        <>
          <p className="text-sm text-muted-foreground">{text.privacy}</p>
          <Button type="button" variant="outline" disabled={status === 'stopping'} onClick={busy ? stopMicrophone : startMicrophone}>
            {busy ? text.stop : text.start}
          </Button>
          <p role="status" className="text-sm text-muted-foreground">
            {status === 'listening' && text.listening}
            {status === 'unavailable' && text.unavailable}
            {status === 'error' && text.error}
          </p>
        </>
      )}
      <Button type="button" disabled={!transcript.trim()} onClick={() => setShowAnalysis(true)}>
        {text.analyze}
      </Button>
      {result && (
        <div aria-live="polite" className="space-y-2 text-sm">
          <p>{text.words} · {result.wordCount}</p>
          <h3 className="font-semibold">{text.followUp}</h3>
          <p>{result.followUp}</p>
          <h3 className="font-semibold">{text.notes}</h3>
          <ul className="list-disc ps-5">
            {result.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      )}
    </section>
  )
}
