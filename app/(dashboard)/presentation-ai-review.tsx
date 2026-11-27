'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type Language = 'ar' | 'en'
type Source = { transcript: string; slides: string[]; topic: string; language: Language }
type Review = { strength: string; gap: string; next_step: string }
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
      task,
    }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const upstream = typeof body?.detail === 'string' ? /^Gemini rejected the request \(HTTP (400|401|403|404)\)$/.exec(body.detail) : null
    throw new Error(upstream ? `gemini-${upstream[1]}` : `backend-${response.status}`)
  }
  return response.json()
}

export function PresentationAIReview({ source, token }: { source: Source; token: string | null }) {
  const ar = source.language === 'ar'
  const [result, setResult] = useState<Review | null>(null)
  const [errorCode, setErrorCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  if (!api || !source.transcript.trim()) return null

  async function analyze() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setStatus('loading')
    setResult(null)
    try {
      const response = await requestPresentationAI(source, 'review', token, controller.signal)
      if (![response.strength, response.gap, response.next_step].every((item) => typeof item === 'string' && item.trim())) {
        throw new Error('Invalid review')
      }
      if (!controller.signal.aborted) {
        setResult(response)
        setStatus('idle')
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setErrorCode(error instanceof TypeError ? 'connection' : error instanceof Error ? (error.name === 'TimeoutError' ? error.name : error.message) : '')
        setStatus('error')
      }
    } finally {
      request.current = null
    }
  }

  const messages: Record<string, [string, string]> = {
    connection: ['تعذّر الاتصال بالـBackend. تأكّد أن Uvicorn شغّال على المنفذ 8000.', 'Could not reach the backend. Check that Uvicorn is running on port 8000.'],
    'backend-401': ['الـBackend يطلب تسجيل الدخول للاستخدام.', 'The backend requires sign-in.'],
    'backend-503': ['مفتاح Gemini غير مضبوط في نافذة تشغيل الـBackend.', 'The Gemini API key is missing from the backend environment.'],
    'backend-429': ['تم بلوغ حدّ طلبات Gemini. التقييم المحلي متاح.', 'Gemini quota was reached. Local feedback is available.'],
    'gemini-400': ['Gemini رفض إعدادات الطلب (400).', 'Gemini rejected the request settings (400).'],
    'gemini-401': ['Gemini رفض مفتاح الوصول (401).', 'Gemini rejected the credentials (401).'],
    'gemini-403': ['Gemini رفض الوصول للمشروع أو الموديل (403).', 'Gemini denied access to the project or model (403).'],
    'gemini-404': ['موديل Gemini غير موجود أو غير متاح للمشروع (404).', 'The Gemini model was not found or is unavailable for this project (404).'],
    TimeoutError: ['انتهت مهلة طلب Gemini.', 'The Gemini request timed out.'],
  }
  const message = messages[errorCode]?.[ar ? 0 : 1]
  return (
    <section className="mt-4 space-y-3 border-t border-slate-200 pt-4 text-sm">
      <h3 className="text-base font-semibold">{ar ? 'مراجعة الشرح بالذكاء الاصطناعي' : 'AI review of your explanation'}</h3>
      <p>{ar ? 'عند طلب المراجعة، يُرسل نص العرض والشرائح إلى Gemini.' : 'Requesting a review sends the transcript and slide text to Gemini.'}</p>
      <Button type="button" variant="outline" disabled={status === 'loading'} onClick={analyze}>
        {status === 'loading' ? (ar ? 'جاري المراجعة…' : 'Reviewing…') : (ar ? 'راجع الشرح' : 'Review my explanation')}
      </Button>
      {status === 'error' && <p role="status">{message ?? (ar ? 'تعذّرت مراجعة الشرح بالذكاء الاصطناعي. الملاحظات المحلية متاحة أعلاه.' : 'AI review is unavailable. Local feedback is available above.')}</p>}
      {result && <dl aria-live="polite" className="space-y-2">
        <div><dt className="font-semibold">{ar ? 'شو انشرح منيح؟' : 'What worked well?'}</dt><dd>{result.strength}</dd></div>
        <div><dt className="font-semibold">{ar ? 'شو ضل ناقص؟' : 'What needs more explanation?'}</dt><dd>{result.gap}</dd></div>
        <div><dt className="font-semibold">{ar ? 'شو تجرّب بالمحاولة الجاية؟' : 'What to try next?'}</dt><dd>{result.next_step}</dd></div>
      </dl>}
    </section>
  )
}
