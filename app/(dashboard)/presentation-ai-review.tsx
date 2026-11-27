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
  if (!response.ok) throw new Error('Presentation AI unavailable')
  return response.json()
}

export function PresentationAIReview({ source, token }: { source: Source; token: string | null }) {
  const ar = source.language === 'ar'
  const [result, setResult] = useState<Review | null>(null)
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
    } catch {
      if (!controller.signal.aborted) setStatus('error')
    } finally {
      request.current = null
    }
  }

  return (
    <section className="mt-4 space-y-3 border-t border-slate-200 pt-4 text-sm">
      <h3 className="text-base font-semibold">{ar ? 'مراجعة الشرح بالذكاء الاصطناعي' : 'AI review of your explanation'}</h3>
      <p>{ar ? 'عند طلب المراجعة، يُرسل نص العرض والشرائح إلى Groq.' : 'Requesting a review sends the transcript and slide text to Groq.'}</p>
      <Button type="button" variant="outline" disabled={status === 'loading'} onClick={analyze}>
        {status === 'loading' ? (ar ? 'جاري المراجعة…' : 'Reviewing…') : (ar ? 'راجع الشرح' : 'Review my explanation')}
      </Button>
      {status === 'error' && <p role="status">{ar ? 'تعذّرت مراجعة الشرح بالذكاء الاصطناعي. الملاحظات المحلية متاحة أعلاه.' : 'AI review is unavailable. Local feedback is available above.'}</p>}
      {result && <dl aria-live="polite" className="space-y-2">
        <div><dt className="font-semibold">{ar ? 'شو انشرح منيح؟' : 'What worked well?'}</dt><dd>{result.strength}</dd></div>
        <div><dt className="font-semibold">{ar ? 'شو ضل ناقص؟' : 'What needs more explanation?'}</dt><dd>{result.gap}</dd></div>
        <div><dt className="font-semibold">{ar ? 'شو تجرّب بالمحاولة الجاية؟' : 'What to try next?'}</dt><dd>{result.next_step}</dd></div>
      </dl>}
    </section>
  )
}
