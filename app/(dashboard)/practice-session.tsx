'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, Maximize, Minimize, X, Square } from 'lucide-react'
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
  | { phase: 'running'; deadline: number; attachment: File | null; roomOption: number }
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
  const [paused, setPaused] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pausedAt = useRef(0)
  const roomRef = useRef<HTMLElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [interview, setInterview] = useState<InterviewDetails | null>(null)
  const interviewText = text.interviewSetup
  const roomLabel = isInterview ? text.interviewPanel : text.audienceSize
  const roomOptions = isInterview ? text.interviewPanelOptions : text.audienceOptions
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
    if (session.phase !== 'running' || paused) return

    function updateTime(deadline: number) {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) finish()
    }

    const timer = window.setInterval(updateTime, 250, session.deadline)
    return () => window.clearInterval(timer)
  }, [session, finish, paused])

  useEffect(() => {
    if (session.phase !== 'running' || isInterview) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const sync = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('fullscreenchange', sync)
      if (document.fullscreenElement === roomRef.current) void document.exitFullscreen().catch(() => {})
    }
  }, [session.phase, isInterview])

  function togglePause() {
    if (session.phase !== 'running') return
    if (paused) {
      setSession({ ...session, deadline: session.deadline + Date.now() - pausedAt.current })
      setPaused(false)
      void videoRef.current?.play().catch(() => {})
    } else {
      pausedAt.current = Date.now()
      setPaused(true)
      videoRef.current?.pause()
    }
  }

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
    const file = fields.get('attachment')
    setSession({
      phase: 'running',
      deadline: Date.now() + duration * 1000,
      attachment: file instanceof File && file.name ? file : null,
      roomOption: Number(fields.get('room-option')),
    })
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, '0')

  if (session.phase === 'running' && !isInterview) {
    const ar = /[\u0600-\u06ff]/.test(practice.running)
    return createPortal(
      <section ref={roomRef} className="fixed inset-0 z-[100] isolate overflow-hidden bg-[#101d2c] text-white" aria-labelledby="practice-session-heading">
        <video ref={videoRef} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover object-center"
          src={`${process.env.NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH ?? ''}/7c1e9fcb-ca5d-4151-b05d-abb0fb50ca64-video.mp4`} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/75 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 to-transparent" />
        <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 sm:p-7">
          <div className="min-w-0">
            <div className="text-xl font-bold tracking-wide">TALEEK <span className="text-orange-300">| طليق</span></div>
            <h1 ref={heading} tabIndex={-1} id="practice-session-heading" className="mt-1 text-sm text-white/85">{practice.running}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/20 bg-[#142332]/85 px-4 py-2 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs text-white/80"><span className={`h-2 w-2 rounded-full ${paused ? 'bg-amber-400' : 'bg-emerald-400'}`} />{paused ? (ar ? 'متوقف مؤقتاً' : 'Paused') : (ar ? 'جلسة مباشرة' : 'Live session')}</div>
              <div role="timer" aria-label={text.remaining} className="text-center text-2xl font-semibold tabular-nums"><bdi dir="ltr">{minutes}:{seconds}</bdi></div>
            </div>
            <button type="button" onClick={onClose} aria-label={text.cancel} title={text.cancel} className="rounded-full bg-black/45 p-3 hover:bg-black/70"><X size={20}/></button>
          </div>
        </header>
        {paused && <div className="pointer-events-none absolute inset-0 grid place-items-center"><span className="rounded-full bg-black/65 px-6 py-3 text-lg backdrop-blur">{ar ? 'الجلسة متوقفة مؤقتاً' : 'Session paused'}</span></div>}
        <footer className="absolute inset-x-0 bottom-0 flex justify-center p-4 sm:p-7">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-3xl border border-white/15 bg-[#142332]/90 p-2 shadow-2xl backdrop-blur-xl sm:gap-3 sm:p-3">
            <button type="button" onClick={togglePause} className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium hover:bg-white/10">{paused ? <Play size={19}/> : <Pause size={19}/>} {paused ? (ar ? 'استئناف' : 'Resume') : (ar ? 'إيقاف مؤقت' : 'Pause')}</button>
            <button type="button" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void roomRef.current?.requestFullscreen?.().catch(() => {}) }} className="rounded-2xl p-3 hover:bg-white/10" aria-label={ar ? 'ملء الشاشة' : 'Toggle fullscreen'} title={ar ? 'ملء الشاشة' : 'Toggle fullscreen'}>{fullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}</button>
            <span className="h-8 w-px bg-white/20"/>
            <button type="button" onClick={finish} className="flex items-center gap-2 rounded-2xl bg-[#c65b40] px-4 py-3 text-sm font-semibold hover:bg-[#ad4931]"><Square size={16} fill="currentColor"/> {text.finish}</button>
          </div>
        </footer>
      </section>, document.body
    )
  }

  return (
    <section id="practice-session" aria-labelledby="practice-session-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <h1 ref={heading} tabIndex={-1} id="practice-session-heading" className="text-2xl font-semibold tracking-tight">
        {session.phase === 'finished' ? text.complete : session.phase === 'ready' ? practice.setup : practice.running}
      </h1>
      {session.phase === 'finished' ? (
        <div className="mt-2"><AssessmentCriteria title={text.assessment} criteria={isTechnical ? interviewText.technicalCriteria : practice.criteria} /></div>
      ) : (
        <>
          {(session.phase === 'running' || isInterview) && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {session.phase === 'ready' ? interviewText.intro : isTechnical ? interviewText.technicalPrompt : practice.prompt}
            </p>
          )}
          {session.phase === 'running' && interview && (
            <div className="mt-4 rounded-lg border border-border bg-background p-3 text-sm">
              <p className="font-semibold wrap-anywhere" dir="auto">{interview.jobTitle}</p>
              <p className="text-muted-foreground">{interviewText[interview.type]}</p>
              {interview.jobDescription && <p className="mt-2 whitespace-pre-wrap wrap-anywhere text-muted-foreground" dir="auto">{interview.jobDescription}</p>}
            </div>
          )}
          {session.phase === 'running' && (
            <p className="mt-3 text-sm text-muted-foreground">
              {roomLabel}: <span className="font-medium text-foreground">{roomOptions[session.roomOption]}</span>
            </p>
          )}
          {session.phase === 'running' && session.attachment && (
            <p className="mt-3 wrap-anywhere text-sm text-muted-foreground">
              {text.attachedFile}: <bdi className="font-medium text-foreground">{session.attachment.name}</bdi>
            </p>
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
            <label htmlFor="room-option" className="block text-sm font-medium">{roomLabel}</label>
            <select id="room-option" name="room-option" defaultValue={0} className={fieldClass}>
              {roomOptions.map((label, index) => <option key={index} value={index}>{label}</option>)}
            </select>
          </div>
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
          <div className="mb-5">
            <label htmlFor="session-attachment" className="block text-sm font-medium">
              {isInterview ? text.cvFile : text.presentationFile}
            </label>
            <input
              id="session-attachment"
              name="attachment"
              type="file"
              accept={isInterview ? '.pdf,.doc,.docx' : '.pdf,.ppt,.pptx,.doc,.docx'}
              className={`${fieldClass} file:me-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-2 file:py-1 file:font-medium file:text-primary`}
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
            <>
              {!isInterview && <Button type="button" variant="outline" onClick={togglePause}>{paused ? 'Resume / استئناف' : 'Pause / إيقاف مؤقت'}</Button>}
              <Button type="button" onClick={finish}>{text.finish}</Button>
            </>
          )}
          <Button type="button" variant={session.phase === 'finished' ? 'default' : 'outline'} onClick={onClose}>
            {session.phase === 'finished' ? text.back : text.cancel}
          </Button>
        </div>
      )}
    </section>
  )
}
