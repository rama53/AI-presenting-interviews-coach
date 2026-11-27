'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { analyzeTranscript, comparePresentations, type AnalysisMode } from '@/lib/transcript-analysis'
import { usePracticeTranscript } from './use-practice-transcript'
import type { Language } from './copy'

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
    compare: 'تحسين النص',
    clear: 'إنهاء المقارنة',
    save: 'حفظ النص الجديد',
    saved: 'تم حفظ النص الجديد وتحديث التحليل.',
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
    compare: 'Revise the transcript',
    clear: 'End comparison',
    save: 'Save revised transcript',
    saved: 'Revised transcript saved and analysis updated.',
    words: 'Word count',
  },
}

export function PracticeAnalysis({ language, mode, running, speech, previousAttempt }: {
  language: Language
  mode: AnalysisMode
  running: boolean
  previousAttempt: string | null
  speech: ReturnType<typeof usePracticeTranscript>
}) {
  const text = labels[language]
  const [firstVersion, setFirstVersion] = useState<string | null>(null)
  const retrySpeech = usePracticeTranscript(language)
  const { transcript: draft, setTranscript: setDraft } = retrySpeech
  const [retryStarted, setRetryStarted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const { transcript, setTranscript, status, busy, startMicrophone, stopMicrophone } = speech
  const result = showAnalysis || !running ? analyzeTranscript({ transcript, language, mode }) : null

  const firstResult = firstVersion === null ? null : analyzeTranscript({ transcript: firstVersion, language, mode })

  const ar = language === 'ar'
  const baseline = saved && firstVersion !== null ? firstVersion : previousAttempt
  const comparison = baseline !== null && baseline.trim() && mode === 'presentation'
    ? comparePresentations(baseline, transcript, language)
    : null

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
          value={firstVersion === null ? transcript : draft}
          onChange={(event) => {
            if (firstVersion === null) setTranscript(event.target.value)
            else {
              setDraft(event.target.value)
              setRetryStarted(true)
            }
            setSaved(false)
            setShowAnalysis(false)
          }}
        />
      </label>
      {firstVersion !== null && (
        <Button type="button" disabled={!draft.trim() || draft === transcript || retrySpeech.busy} onClick={() => {
          setTranscript(draft)
          setSaved(true)
        }}>{text.save}</Button>
      )}
      {firstVersion !== null && (
        <>
          <Button type="button" variant="outline" disabled={retrySpeech.status === 'stopping'} onClick={() => {
            if (retrySpeech.busy) retrySpeech.stopMicrophone()
            else {
              if (!retryStarted) {
                setDraft('')
                setRetryStarted(true)
              }
              setSaved(false)
              retrySpeech.startMicrophone()
            }
          }}>{retrySpeech.busy ? text.stop : text.start}</Button>
          <p className="text-sm text-muted-foreground">{text.privacy}</p>
          {(retrySpeech.status === 'error' || retrySpeech.status === 'unavailable') && <p role="status">{text.error}</p>}
        </>
      )}
      {saved && <p role="status" className="text-sm">{text.saved}</p>}
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
          {comparison && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <h3 className="font-semibold">{ar ? 'شو تحسّن؟' : 'What improved?'}</h3>
              <ul className="list-disc ps-5">{(comparison.improved.length ? comparison.improved : [ar ? 'ما ظهر تحسّن واضح بمعايير الموضوع والمثال.' : 'No clear gain was detected in topic or example.']).map((item) => <li key={item}>{item}</li>)}</ul>
              <h3 className="font-semibold">{ar ? 'شو ضل ناقص؟' : 'What still needs work?'}</h3>
              <ul className="list-disc ps-5">{(comparison.remaining.length ? comparison.remaining : [ar ? 'الموضوع والمثال موجودين. راجعي إذا المثال بدعم فكرتك.' : 'Topic and example cues are present. Check that the example supports your point.']).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
          {!running && firstVersion === null && (
            <Button type="button" variant="outline" onClick={() => {
              setFirstVersion(transcript)
              setDraft(transcript)
              setRetryStarted(false)
              setSaved(false)
              document.getElementById('practice-transcript')?.focus()
            }}>{text.compare}</Button>
          )}
          {firstResult && (
            <details open className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer font-medium">{text.before}</summary>
              <blockquote className="my-2 whitespace-pre-wrap" dir="auto">{firstVersion}</blockquote>
              <p>{firstResult.note}</p>
              <Button className="mt-2" type="button" variant="outline" onClick={() => {
                retrySpeech.stopMicrophone()
                setFirstVersion(null)
                setSaved(false)
              }}>{text.clear}</Button>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
