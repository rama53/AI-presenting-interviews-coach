'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { DashboardCopy } from './copy'
import { AssessmentCriteria } from './assessment-criteria'

type Practice = {
  setup: string
  running: string
  defaultMinutes: number
  prompt: string
  criteria: readonly string[]
}

type Session =
  | { phase: 'ready' }
  | { phase: 'running'; deadline: number }
  | { phase: 'finished' }

export function PracticeSession({ practice, text, onClose, onComplete }: {
  practice: Practice
  text: DashboardCopy
  onClose: () => void
  onComplete: () => void
}) {
  const [session, setSession] = useState<Session>({ phase: 'ready' })
  const [secondsLeft, setSecondsLeft] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const completed = useRef(false)

  const finish = useCallback(() => {
    if (completed.current) return
    completed.current = true
    setSession({ phase: 'finished' })
    onComplete()
  }, [onComplete])

  useEffect(() => {
    heading.current?.focus()
  }, [session.phase])

  useEffect(() => {
    if (session.phase !== 'running') return

    function updateTime(deadline: number) {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) finish()
    }

    const timer = window.setInterval(updateTime, 250, session.deadline)
    return () => window.clearInterval(timer)
  }, [session, finish])

  function startPractice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const duration = Number(new FormData(event.currentTarget).get('minutes')) * 60
    setSecondsLeft(duration)
    setSession({ phase: 'running', deadline: Date.now() + duration * 1000 })
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, '0')

  return (
    <section id="practice-session" aria-labelledby="practice-session-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <h1 ref={heading} tabIndex={-1} id="practice-session-heading" className="text-2xl font-semibold tracking-tight">
        {session.phase === 'finished' ? text.complete : session.phase === 'ready' ? practice.setup : practice.running}
      </h1>
      {session.phase === 'finished' ? (
        <div className="mt-2"><AssessmentCriteria title={text.assessment} criteria={practice.criteria} /></div>
      ) : (
        <>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{practice.prompt}</p>
          {session.phase === 'running' && (
            <p role="timer" aria-label={text.remaining} className="mt-4 text-3xl font-semibold tabular-nums">
              <bdi dir="ltr">{minutes}:{seconds}</bdi>
            </p>
          )}
        </>
      )}
      {session.phase === 'ready' ? (
        <form className="mt-4" onSubmit={startPractice}>
          <div className="mb-4">
            <label htmlFor="session-minutes" className="block text-sm font-medium">{text.duration}</label>
            <input
              id="session-minutes"
              name="minutes"
              type="number"
              min={1}
              max={120}
              defaultValue={practice.defaultMinutes}
              required
              className="mt-1.5 w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">{text.start}</Button>
            <Button type="button" variant="outline" onClick={onClose}>{text.cancel}</Button>
          </div>
        </form>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          {session.phase === 'running' && (
            <Button type="button" onClick={finish}>{text.finish}</Button>
          )}
          <Button type="button" variant={session.phase === 'finished' ? 'default' : 'outline'} onClick={onClose}>
            {session.phase === 'finished' ? text.back : text.cancel}
          </Button>
        </div>
      )}
    </section>
  )
}
