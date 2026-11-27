'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { DashboardCopy } from './copy'
import type { InterviewType } from './recent-sessions'
import { AssessmentCriteria } from './assessment-criteria'

type Practice = {
  setup: string
  running: string
  defaultMinutes: number
  prompt: string
  criteria: readonly string[]
}

type InterviewDetails = {
  type: InterviewType
  jobTitle: string
  jobDescription: string
}

const interviewMaxMinutes = 20
const fieldClass = 'mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring'

type Session =
  | { phase: 'ready' }
  | { phase: 'running'; deadline: number }
  | { phase: 'finished' }

export function PracticeSession({ practice, text, isInterview, onClose, onComplete }: {
  practice: Practice
  text: DashboardCopy
  isInterview: boolean
  onClose: () => void
  onComplete: (interviewType?: InterviewType) => void
}) {
  const [session, setSession] = useState<Session>({ phase: 'ready' })
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [interview, setInterview] = useState<InterviewDetails | null>(null)
  const interviewText = text.interviewSetup
  const isTechnical = interview?.type === 'technical'
  const heading = useRef<HTMLHeadingElement>(null)
  const completed = useRef(false)

  const finish = useCallback(() => {
    if (completed.current) return
    completed.current = true
    setSession({ phase: 'finished' })
    onComplete(interview?.type)
  }, [interview?.type, onComplete])

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
    const fields = new FormData(event.currentTarget)
    const duration = Number(fields.get('minutes')) * 60
    if (isInterview) {
      setInterview({
        type: fields.get('interview-type') === 'technical' ? 'technical' : 'personal',
        jobTitle: String(fields.get('job-title') ?? '').trim(),
        jobDescription: String(fields.get('job-description') ?? '').trim(),
      })
    }
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
        <div className="mt-2"><AssessmentCriteria title={text.assessment} criteria={isTechnical ? interviewText.technicalCriteria : practice.criteria} /></div>
      ) : (
        <>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {session.phase === 'ready' && isInterview ? interviewText.intro : isTechnical ? interviewText.technicalPrompt : practice.prompt}
          </p>
          {session.phase === 'running' && interview && (
            <div className="mt-4 rounded-lg border border-border bg-background p-3 text-sm">
              <p className="font-semibold wrap-anywhere" dir="auto">{interview.jobTitle}</p>
              <p className="text-muted-foreground">{interviewText[interview.type]}</p>
              {interview.jobDescription && <p className="mt-2 whitespace-pre-wrap wrap-anywhere text-muted-foreground" dir="auto">{interview.jobDescription}</p>}
            </div>
          )}
          {session.phase === 'running' && (
            <p role="timer" aria-label={text.remaining} className="mt-4 text-3xl font-semibold tabular-nums">
              <bdi dir="ltr">{minutes}:{seconds}</bdi>
            </p>
          )}
        </>
      )}
      {session.phase === 'ready' ? (
        <form className="mt-4" onSubmit={startPractice}>
          {isInterview && (
            <div className="mb-5 grid gap-5">
              <fieldset>
                <legend className="text-sm font-medium">{interviewText.type}</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(['personal', 'technical'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-3 text-sm has-checked:border-primary has-checked:bg-primary-soft">
                      <input type="radio" name="interview-type" value={type} defaultChecked={type === 'personal'} className="accent-primary" />
                      {interviewText[type]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="job-title" className="block text-sm font-medium">{interviewText.jobTitle}</label>
                <input
                  id="job-title"
                  name="job-title"
                  dir="auto"
                  required
                  maxLength={120}
                  pattern={String.raw`.*\S.*`}
                  placeholder={interviewText.jobTitlePlaceholder}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="job-description" className="block text-sm font-medium">{interviewText.jobDescription}</label>
                <textarea
                  id="job-description"
                  name="job-description"
                  dir="auto"
                  rows={4}
                  maxLength={4000}
                  placeholder={interviewText.jobDescriptionPlaceholder}
                  className={fieldClass}
                />
              </div>
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="session-minutes" className="block text-sm font-medium">{text.duration}</label>
            <input
              id="session-minutes"
              name="minutes"
              type="number"
              min={1}
              max={isInterview ? interviewMaxMinutes : 120}
              aria-describedby={isInterview ? 'interview-duration-hint' : undefined}
              defaultValue={practice.defaultMinutes}
              required
              className="mt-1.5 w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            />
            {isInterview && <p id="interview-duration-hint" className="mt-1 text-xs text-muted-foreground">{interviewText.durationHint}</p>}
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
