'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { analyzeTranscript, type AnalysisMode } from '@/lib/transcript-analysis'
import type { Language } from './copy'
import type { usePracticeTranscript } from './use-practice-transcript'

const labels = {
  ar: {
    title: 'تحليل النص',
    transcript: 'نص الإجابة أو العرض',
    start: 'تحويل الصوت إلى نص',
    stop: 'إيقاف المايك',
    listening: 'المايك شغّال…',
    privacy: 'قد يرسل المتصفح الصوت لخدمة التعرّف على الكلام. بإمكانك تكتبي النص يدويًا.',
    unavailable: 'التعرّف على الكلام غير متاح. اكتبي النص يدويًا.',
    error: 'تعذّر تحويل الصوت إلى نص. جرّبي مرة ثانية أو اكتبي النص يدويًا.',
    analyze: 'حلّل النص',
    followUp: 'سؤال متابعة',
    notes: 'شو تحسّني؟',
    evidence: 'من كلامك',
    retry: 'جرّبيها مرة ثانية',
    before: 'ملاحظة على النسخة الأولى',
    compare: 'جرّبي تحسين النص',
    clear: 'إنهاء المقارنة',
    words: 'عدد الكلمات',
  },
  en: {
    title: 'Transcript analysis',
    transcript: 'Answer or presentation transcript',
    start: 'Transcribe speech',
    stop: 'Stop microphone',
    listening: 'Listening…',
    privacy: 'Your browser may send audio to a speech recognition service. You can type your transcript instead.',
    unavailable: 'Speech recognition is unavailable. You can type your transcript.',
    error: 'Could not transcribe speech. Try again or type your transcript.',
    analyze: 'Analyze text',
    followUp: 'Follow-up question',
    notes: 'What to improve',
    evidence: 'From your transcript',
    retry: 'Try it again',
    before: 'Feedback on your first version',
    compare: 'Try revising your text',
    clear: 'End comparison',
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
  const [firstVersion, setFirstVersion] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const { transcript, setTranscript, status, busy, startMicrophone, stopMicrophone } = speech
  const result = showAnalysis || !running ? analyzeTranscript({ transcript, language, mode }) : null

  const firstResult = firstVersion === null ? null : analyzeTranscript({ transcript: firstVersion, language, mode })

  return (
    <section className="mt-5 space-y-3 rounded-xl border border-border bg-background p-4">
      <h2 className="font-semibold">{text.title}</h2>
      <label className="block text-sm font-medium">
        {text.transcript}
        <textarea
          id="practice-transcript"
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
          <p>{result.note}</p>
          {result.evidence && (
            <figure className="rounded-lg border-s-2 border-primary bg-card p-3">
              <figcaption className="font-medium">{text.evidence}</figcaption>
              <blockquote dir="auto">«{result.evidence}»</blockquote>
            </figure>
          )}
          <div className="rounded-lg bg-primary-soft p-3">
            <h3 className="font-semibold">{text.retry}</h3>
            <p className="mt-1">{result.retry}</p>
          </div>
          {!running && firstVersion === null && (
            <Button type="button" variant="outline" onClick={() => {
              setFirstVersion(transcript)
              document.getElementById('practice-transcript')?.focus()
            }}>{text.compare}</Button>
          )}
          {firstResult && (
            <details open className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer font-medium">{text.before}</summary>
              <blockquote className="my-2 whitespace-pre-wrap" dir="auto">{firstVersion}</blockquote>
              <p>{firstResult.note}</p>
              <Button className="mt-2" type="button" variant="outline" onClick={() => setFirstVersion(null)}>{text.clear}</Button>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
