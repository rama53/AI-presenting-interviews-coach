'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, AudioLines, Clock3, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PracticeSession } from './practice-session'

const practiceOptions = [
  {
    id: 'presentation',
    title: 'Practice Presentation',
    description: 'Rehearse a project update with a clear opening, one main point, and a close.',
    seconds: 180,
    icon: AudioLines,
    action: 'Start a presentation',
    prompt: 'Give a short update on a project you know well. Explain why it matters, what changed, and what should happen next.',
    review: 'Could someone repeat your main point and name the next step after hearing your talk?',
  },
  {
    id: 'interview',
    title: 'Practice Interview',
    description: 'Answer a behavioral question using a specific example from your experience.',
    seconds: null,
    icon: MessageSquareText,
    action: 'Start an interview',
    prompt: 'Tell me about a time you had to solve a problem with limited information. What did you do, and what happened?',
    review: 'Did you explain your own action and give a concrete result?',
  },
] as const

export function DashboardPage() {
  const [selectedPractice, setSelectedPractice] = useState<(typeof practiceOptions)[number] | null>(null)
  const practiceTrigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (selectedPractice === null && practiceTrigger.current) {
      practiceTrigger.current.focus()
      practiceTrigger.current = null
    }
  }, [selectedPractice])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4 sm:px-8">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-sidebar-primary">
            <span className="size-2 rounded-full bg-sidebar-primary-foreground" />
          </span>
          <span className="text-lg font-semibold tracking-tight">speakwell</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Practice speaking</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Choose a presentation or interview prompt and rehearse aloud with a timer.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {practiceOptions.map((option) => {
            const Icon = option.icon
            const isPresentation = option.id === 'presentation'
            return (
              <Card key={option.id} className={`rounded-[20px] border p-0 shadow-none ${isPresentation ? 'border-primary-border bg-primary-soft' : 'border-info-border bg-info-soft'}`}>
                <CardContent className="flex h-full flex-col items-start p-5 sm:p-6">
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className={`grid size-10 place-items-center rounded-xl bg-white/80 ${isPresentation ? 'text-primary' : 'text-info'}`}>
                      <Icon aria-hidden="true" className="size-5" />
                    </div>
                    {option.seconds !== null && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Clock3 aria-hidden="true" className="size-4" /> {option.seconds / 60} min
                      </span>
                    )}
                  </div>
                  <h2 className="mt-4 text-xl font-semibold tracking-tight">{option.title}</h2>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{option.description}</p>
                  <Button
                    size="lg"
                    type="button"
                    aria-expanded={selectedPractice?.id === option.id}
                    aria-controls={selectedPractice?.id === option.id ? 'practice-session' : undefined}
                    disabled={selectedPractice !== null}
                    onClick={(event) => {
                      practiceTrigger.current = event.currentTarget
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
        </div>

        {selectedPractice ? (
          <PracticeSession key={selectedPractice.id} practice={selectedPractice} onClose={() => setSelectedPractice(null)} />
        ) : (
          <section aria-labelledby="sample-feedback" className="mt-7 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 id="sample-feedback" className="text-lg font-semibold">Sample interview feedback</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">Behavioral question.</strong> You explained what you did. Next time, end with a concrete result so the interviewer can see your impact.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
