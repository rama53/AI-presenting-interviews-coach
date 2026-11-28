'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Language = 'ar' | 'en'
export type AudienceAnswer = { question: string; answer: string }
type Source = { transcript: string; slides: string[]; topic: string; language: Language; audience_answer?: AudienceAnswer }
export type PresentationReview = {
  score: number | null
  summary: string
  strength: string
  gap: string
  next_step: string
  audience_feedback: { feedback: string; improvement: string } | null
}
const api = process.env.NEXT_PUBLIC_TALEEQ_API_URL?.replace(/\/$/, '')

export const presentationAIAvailable = Boolean(api)

export async function requestPresentationAI(source: Source, task: 'question' | 'review', token: string | null, signal: AbortSignal) {
  const response = await fetch(`${api}/ai/presentation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
    body: JSON.stringify({
      ...source,
      transcript: source.transcript.slice(0, 16000),
      slides: source.slides.filter((slide) => slide.trim()).slice(0, 30).map((slide) => slide.slice(0, 1500)),
      audience_answer: task === 'review' && source.audience_answer ? {
        question: source.audience_answer.question.slice(0, 500),
        answer: source.audience_answer.answer.slice(0, 6000),
      } : undefined,
      task,
    }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const upstream = typeof body?.detail === 'string' ? /^Groq rejected the request \(HTTP (400|401|403|404)\)$/.exec(body.detail) : null
    if (body?.detail === 'Groq returned an incomplete response') throw new Error('groq-incomplete')
    throw new Error(upstream ? `groq-${upstream[1]}` : `backend-${response.status}`)
  }
  return response.json()
}

export function PresentationAIReview({ source, token, automatic, onResult }: {
  source: Source
  token: string | null
  automatic: boolean
  onResult: (review: { transcript: string; result: PresentationReview }) => void
}) {
  const { transcript, slides, topic, language, audience_answer } = source
  const ar = language === 'ar'
  const hasTranscript = Boolean(transcript.trim())
  const canReview = presentationAIAvailable && (hasTranscript || Boolean(audience_answer))
  const [attempt, setAttempt] = useState(automatic ? 1 : 0)
  const [result, setResult] = useState<PresentationReview | null>(null)
  const [errorCode, setErrorCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (!canReview || !attempt) return
    const controller = new AbortController()
    async function analyze() {
      setStatus('loading')
      setResult(null)
      try {
        const response = await requestPresentationAI({ transcript, slides, topic, language, audience_answer }, 'review', token, controller.signal)
        const fields = [response.summary, response.strength, response.gap, response.next_step]
        if (audience_answer) fields.push(response.audience_feedback?.feedback, response.audience_feedback?.improvement)
        const score = response.score
        if (!fields.every((item) => typeof item === 'string' && item.trim()) ||
          (score !== null && (!Number.isInteger(score) || score < 0 || score > 100))) {
          throw new Error('Invalid review')
        }
        if (!controller.signal.aborted) {
          setResult(response)
          onResult({ transcript, result: response })
          setStatus('idle')
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorCode(error instanceof TypeError ? 'connection' : error instanceof Error ? (error.name === 'TimeoutError' ? error.name : error.message) : '')
          setStatus('error')
        }
      }
    }
    void analyze()
    return () => controller.abort()
  }, [attempt, canReview, transcript, slides, topic, language, audience_answer, token, onResult])

  if (!canReview) return null

  const messages: Record<string, [string, string]> = {
    connection: ['تعذّر الاتصال بالـBackend. تأكّد أن Uvicorn شغّال على المنفذ 8000.', 'Could not reach the backend. Check that Uvicorn is running on port 8000.'],
    'backend-401': ['الـBackend يطلب تسجيل الدخول للاستخدام.', 'The backend requires sign-in.'],
    'backend-503': ['مفتاح Groq غير مضبوط في نافذة تشغيل الـBackend.', 'The Groq API key is missing from the backend environment.'],
    'backend-504': ['الـBackend شغّال، بس ما قدر يتصل بـGroq. جرّب المراجعة مرة ثانية.', 'The backend is running but could not reach Groq. Try reviewing again.'],
    'groq-incomplete': ['Groq رجّع مراجعة ناقصة أو بصيغة غير متوقعة. جرّب المراجعة مرة ثانية.', 'Groq returned an incomplete or unexpected review. Try reviewing again.'],
    'backend-429': ['تم بلوغ حدّ طلبات Groq. التقييم المحلي متاح.', 'Groq quota was reached. Local feedback is available.'],
    'groq-400': ['Groq رفض إعدادات الطلب (400).', 'Groq rejected the request settings (400).'],
    'groq-401': ['Groq رفض مفتاح الوصول (401).', 'Groq rejected the credentials (401).'],
    'groq-403': ['Groq رفض الوصول للمشروع أو الموديل (403).', 'Groq denied access to the project or model (403).'],
    'groq-404': ['موديل Groq غير موجود أو غير متاح للمشروع (404).', 'The Groq model was not found or is unavailable for this project (404).'],
    TimeoutError: ['انتهت مهلة طلب Groq.', 'The Groq request timed out.'],
  }
  const message = messages[errorCode]?.[ar ? 0 : 1]
  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 text-[#142B49]">
      <div className="flex items-center gap-5">
        {hasTranscript && result?.score != null && (
          <div dir="ltr" className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 border-[#29966B] text-3xl font-bold">
            {result.score}<span className="text-xs">/100</span>
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold">{ar ? 'تقييم العرض الذكي' : 'AI presentation review'}</h2>
          {hasTranscript && result && <p className="mt-2 text-sm">{result.summary}</p>}
        </div>
      </div>
      {!result && status !== 'loading' && (
        <>
          {!automatic && <p className="text-sm">{ar ? 'يُرسل طلب التقييم نص العرض والشرائح وإجابة سؤال الجمهور، إن وُجدت، إلى Groq.' : 'Requesting feedback sends the transcript, slides, and any audience answer to Groq.'}</p>}
          <Button type="button" variant="outline" onClick={() => setAttempt(value => value + 1)}>
            {status === 'error' ? (ar ? 'إعادة المحاولة' : 'Try again') : (ar ? 'قيّم العرض' : 'Review my presentation')}
          </Button>
        </>
      )}
      {status === 'loading' && <p role="status" className="animate-pulse text-sm">{ar ? 'جاري تحليل العرض بالذكاء الاصطناعي…' : 'AI is reviewing your presentation…'}</p>}
      {status === 'error' && <p role="status" className="text-sm">{message ?? (ar ? 'تعذّر تقييم العرض بالذكاء الاصطناعي. الملاحظات المحلية متاحة أدناه.' : 'AI review is unavailable. Local feedback is available below.')}</p>}
      {result && <div aria-live="polite" className="space-y-4">
        {hasTranscript && <>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-[#CDEBDD] p-4"><h3 className="font-bold">{ar ? 'نقاط القوة' : 'Strengths'}</h3><p className="mt-2 text-sm">{result.strength}</p></div>
            <div className="rounded-xl bg-[#FCD4A5] p-4"><h3 className="font-bold">{ar ? 'فرص التحسين' : 'Improvements'}</h3><p className="mt-2 text-sm">{result.gap}</p></div>
          </div>
          <div className="rounded-xl bg-[#DCD0FA] p-4"><h3 className="font-bold">{ar ? 'خطة تطوير مخصصة' : 'Personal action plan'}</h3><p className="mt-2 text-sm">{result.next_step}</p></div>
        </>}
        {audience_answer && result.audience_feedback && (
          <>
            <h3 className="font-bold">{ar ? 'تحليل إجابة سؤال الجمهور' : 'Audience answer analysis'}</h3>
            <details open className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-semibold">{audience_answer.question}</summary>
              <p dir="auto" className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{audience_answer.answer}</p>
              <p className="mt-3 text-sm">{result.audience_feedback.feedback}</p>
              <p className="mt-3 rounded-lg bg-[#F0F4FA] p-3 text-sm">{result.audience_feedback.improvement}</p>
            </details>
          </>
        )}
      </div>}
    </section>
  )
}
