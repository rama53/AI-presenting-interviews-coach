'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, AudioLines, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardSidebar } from './dashboard-sidebar'
import { RecentSessions, readSessions, saveSession, type PracticeId, type SessionRecord } from './recent-sessions'
import { PracticeSession } from './practice-session'

const practiceOptions = [
  {
    id: 'presentation',
    title: 'Presentation',
    description: 'Rehearse a project update with a clear opening, one main point, and a close.',
    defaultMinutes: 3,
    icon: AudioLines,
    action: 'Set up presentation',
    prompt: 'Give a short update on a project you know well. Explain why it matters, what changed, and what should happen next.',
    review: 'Could someone repeat your main point and name the next step after hearing your talk?',
  },
  {
    id: 'interview',
    title: 'Interview',
    description: 'Answer a behavioral question using a specific example from your experience.',
    defaultMinutes: 2,
    icon: MessageSquareText,
    action: 'Set up interview',
    prompt: 'Tell me about a time you had to solve a problem with limited information. What did you do, and what happened?',
    review: 'Did you explain your own action and give a concrete result?',
  },
] as const

export function DashboardPage() {
  const [selectedPractice, setSelectedPractice] = useState<(typeof practiceOptions)[number] | null>(null)
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const practiceTrigger = useRef<PracticeId | null>(null)

  useEffect(() => {
    setSessions(readSessions())
  }, [])

  useEffect(() => {
    if (selectedPractice === null && practiceTrigger.current) {
      document.getElementById(`choose-${practiceTrigger.current}`)?.focus()
      practiceTrigger.current = null
    }
  }, [selectedPractice])

  if (selectedPractice) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <PracticeSession
          practice={selectedPractice}
          onClose={() => setSelectedPractice(null)}
          onComplete={() => setSessions(saveSession(selectedPractice.id, sessions))}
        />
      </main>
    )
  }

  return (
    <div id="dashboard" className="min-h-screen bg-background text-foreground lg:flex">
      <DashboardSidebar />

      <main className="mx-auto w-full min-w-0 max-w-5xl px-5 py-9 sm:px-8 lg:py-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Practice speaking</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Choose a presentation or interview to set up your next practice session.
        </p>

        <section id="practice" aria-label="Practice options" className="mt-7 grid scroll-mt-6 gap-4 sm:grid-cols-2">
          {practiceOptions.map((option) => {
            const Icon = option.icon
            const isPresentation = option.id === 'presentation'
            return (
              <Card key={option.id} className={`rounded-[20px] border p-0 shadow-none ${isPresentation ? 'border-primary-border bg-primary-soft' : 'border-info-border bg-info-soft'}`}>
                <CardContent className="flex h-full flex-col items-start p-5 sm:p-6">
                  <div className={`grid size-10 place-items-center rounded-xl bg-white/80 ${isPresentation ? 'text-primary' : 'text-info'}`}>
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold tracking-tight">{option.title}</h2>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{option.description}</p>
                  <Button
                    size="lg"
                    type="button"
                    id={`choose-${option.id}`}
                    onClick={() => {
                      practiceTrigger.current = option.id
                      setSelectedPractice(option)
                    }}
                    className={`mt-5 rounded-xl ${isPresentation ? 'bg-primary hover:bg-primary-hover' : 'bg-info hover:bg-info-strong'}`}
                  >
                    {option.action}<ArrowRight aria-hidden="true" data-icon="inline-end" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <RecentSessions sessions={sessions} options={practiceOptions} />
      </main>
    </div>
  )
}
