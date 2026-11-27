'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { analyzeTranscript, type AnalysisMode } from '@/lib/transcript-analysis'
import type { Language } from './copy'
import type { usePracticeTranscript } from './use-practice-transcript'

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

export function PracticeAnalysis({ language, mode, running, speech }: {
  language: Language
  mode: AnalysisMode
  running: boolean
  speech: ReturnType<typeof usePracticeTranscript>
}) {
  const text = labels[language]
  const [showAnalysis, setShowAnalysis] = useState(false)
  const { transcript, setTranscript, status, busy, startMicrophone, stopMicrophone } = speech
  const result = showAnalysis || !running ? analyzeTranscript({ transcript, language, mode }) : null

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
      {running && (
        <Button type="button" disabled={!transcript.trim()} onClick={() => setShowAnalysis(true)}>
          {text.analyze}
        </Button>
      )}
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
