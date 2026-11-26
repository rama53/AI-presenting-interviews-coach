'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'

type Practice = {
  title: string
  seconds: number | null
  prompt: string
  review: string
}

type Session =
  | { phase: 'ready' }
  | { phase: 'running'; deadline: number }
  | { phase: 'finished' }

export function PracticeSession({ practice, onClose }: { practice: Practice; onClose: () => void }) {
  const [session, setSession] = useState<Session>({ phase: 'ready' })
  const [secondsLeft, setSecondsLeft] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [session.phase])

  useEffect(() => {
    if (session.phase !== 'running') return

    function updateTime(deadline: number) {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) setSession({ phase: 'finished' })
    }

    const timer = window.setInterval(updateTime, 250, session.deadline)
    return () => window.clearInterval(timer)
  }, [session])

  function startPractice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const duration = practice.seconds ?? Number(new FormData(event.currentTarget).get('minutes')) * 60
    setSecondsLeft(duration)
    setSession({ phase: 'running', deadline: Date.now() + duration * 1000 })
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, '0')

  return (
    <section id="practice-session" aria-labelledby="practice-session-heading" className="mt-7 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 ref={heading} tabIndex={-1} id="practice-session-heading" className="text-lg font-semibold">
        {session.phase === 'finished' ? 'Practice complete' : practice.title}
      </h2>
      {session.phase === 'finished' ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">Self-review.</strong> {practice.review}
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{practice.prompt}</p>
          {session.phase === 'running' && (
            <p role="timer" aria-label="Time remaining" className="mt-4 text-3xl font-semibold tabular-nums">
              {minutes}:{seconds}
            </p>
          )}
        </>
      )}
      {session.phase === 'ready' ? (
        <form className="mt-4" onSubmit={startPractice}>
          {practice.seconds === null && (
            <div className="mb-4">
              <label htmlFor="interview-minutes" className="block text-sm font-medium">Interview length (minutes)</label>
              <input
                id="interview-minutes"
                name="minutes"
                type="number"
                min={1}
                max={120}
                defaultValue={2}
                required
                className="mt-1.5 w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Start timer</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel practice</Button>
          </div>
        </form>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          {session.phase === 'running' && (
            <Button type="button" onClick={() => setSession({ phase: 'finished' })}>Finish practice</Button>
          )}
          <Button type="button" variant={session.phase === 'finished' ? 'default' : 'outline'} onClick={onClose}>
            {session.phase === 'finished' ? 'Back to practice options' : 'Cancel practice'}
          </Button>
        </div>
      )}
    </section>
  )
}
