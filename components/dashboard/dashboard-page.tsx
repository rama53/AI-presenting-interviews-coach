'use client'

import { useState } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  MessageSquareText,
  Mic2,
  Play,
  Sparkles,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DashboardSidebar } from './dashboard-sidebar'
import { ProgressChart } from './progress-chart'

const sessions = [
  { type: 'Job interview', focus: 'Behavioral questions', date: 'May 27, 2025', score: 88, tone: 'Interview' },
  { type: 'Presentation', focus: 'Project showcase', date: 'May 22, 2025', score: 84, tone: 'Presentation' },
  { type: 'Job interview', focus: 'Tell me about yourself', date: 'May 18, 2025', score: 79, tone: 'Interview' },
]

const metrics = [
  { label: 'Total sessions', value: '24', detail: 'You showed up 4 times this month', icon: AudioLines },
  { label: 'Latest score', value: '88', suffix: '/100', detail: 'Your best score so far', icon: Sparkles },
  { label: 'Improvement', value: '+18', suffix: ' pts', detail: 'Compared to your first session', icon: ArrowUpRight },
]

const practiceOptions = [
  {
    title: 'Practice Presentation',
    description: 'Find your rhythm, sharpen your story, and feel at home in front of a room.',
    duration: '5–15 min',
    icon: AudioLines,
    action: 'Start a presentation',
    style: 'presentation',
  },
  {
    title: 'Practice Interview',
    description: 'Work through thoughtful questions and make your experience come through clearly.',
    duration: '10–20 min',
    icon: MessageSquareText,
    action: 'Start an interview',
    style: 'interview',
  },
]

export function DashboardPage() {
  const [selectedPractice, setSelectedPractice] = useState<string | null>(null)

  return (
    <div id="dashboard" className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <div className="min-w-0 flex-1">
          <header className="hidden items-center justify-between border-b border-border bg-card px-8 py-4 lg:flex xl:px-12">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span>Workspace</span><span aria-hidden="true">/</span><span className="font-medium text-secondary-foreground">Dashboard</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-2 text-[11px] font-medium text-muted-foreground">
              <CalendarDays aria-hidden="true" className="size-3.5 text-muted-foreground" />
              Wednesday, May 28
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1260px] px-5 pb-12 pt-24 sm:px-8 sm:pt-24 lg:pt-10 xl:px-12" aria-labelledby="welcome-title">
            <section className="mb-8 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Wednesday, May 28</p>
                <h1 id="welcome-title" className="text-[30px] font-semibold leading-tight tracking-[-0.045em] text-foreground sm:text-[36px]">Good morning, Maya.</h1>
                <p className="mt-2 text-[14px] text-muted-foreground sm:text-[15px]">A little practice today can make a big difference tomorrow.</p>
              </div>
              <a className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-fit rounded-xl border-border bg-white px-4 text-[12px] text-muted-foreground shadow-none hover:bg-muted')} href="#practice">
                <Play aria-hidden="true" data-icon="inline-start" />
                Pick up where you left off
              </a>
            </section>

            <section id="practice" aria-labelledby="practice-heading" className="mb-8">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 id="practice-heading" className="text-[17px] font-semibold tracking-[-0.025em]">Ready when you are</h2>
                  <p className="mt-1 text-[12px] text-muted-foreground">Choose what you&apos;d like to work on today.</p>
                </div>
                <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-success" /> All progress saved</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {practiceOptions.map((option) => {
                  const Icon = option.icon
                  const isPresentation = option.style === 'presentation'
                  return (
                    <Card key={option.title} className={`overflow-hidden rounded-[20px] border p-0 shadow-none ${isPresentation ? 'border-primary-border bg-primary-soft' : 'border-info-border bg-info-soft'}`}>
                      <CardContent className="flex min-h-[190px] flex-col justify-between p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className={`flex size-10 items-center justify-center rounded-[13px] bg-white/80 ${isPresentation ? 'text-primary' : 'text-info'}`}>
                            <Icon aria-hidden="true" className="size-[19px]" strokeWidth={1.8} />
                          </div>
                          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${isPresentation ? 'bg-white/65 text-accent-foreground' : 'bg-white/80 text-info-strong'}`}>
                            <Clock3 aria-hidden="true" className="size-3" /> {option.duration}
                          </span>
                        </div>
                        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                          <div className="max-w-[340px]">
                            <h3 className="text-[19px] font-semibold tracking-[-0.035em] text-foreground">{option.title}</h3>
                            <p className="mt-1.5 text-[12px] leading-[1.65] text-muted-foreground">{option.description}</p>
                          </div>
                          <Button
                            size="lg"
                            onClick={() => setSelectedPractice(option.title)}
                            className={`shrink-0 rounded-xl px-4 text-[12px] shadow-none ${isPresentation ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-info text-white hover:bg-info-strong'}`}
                          >
                            {option.action}<ArrowRight aria-hidden="true" data-icon="inline-end" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              {selectedPractice && (
                <div role="status" className="mt-3 flex items-start gap-2.5 rounded-xl border border-primary-border bg-white px-4 py-3 text-[12px] text-muted-foreground">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p><span className="font-semibold">{selectedPractice} selected.</span> Your practice is ready to begin in this demo.</p>
                  <button type="button" className="ml-auto text-muted-foreground underline underline-offset-2" onClick={() => setSelectedPractice(null)}>Dismiss</button>
                </div>
              )}
            </section>

            <section aria-labelledby="overview-heading" className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 id="overview-heading" className="text-[17px] font-semibold tracking-[-0.025em]">Your progress at a glance</h2>
                  <p className="mt-1 text-[12px] text-muted-foreground">Every session is helping you build confidence.</p>
                </div>
                <a href="#progress" className="hidden items-center gap-1 text-[11px] font-medium text-primary sm:flex">See your progress <ArrowRight aria-hidden="true" className="size-3.5" /></a>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {metrics.map(({ label, value, suffix, detail, icon: Icon }, index) => (
                  <Card key={label} className="rounded-[17px] border-border bg-white shadow-none">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                        <Icon aria-hidden="true" className={`size-4 ${index === 2 ? 'text-success' : 'text-muted-foreground'}`} strokeWidth={1.8} />
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-[28px] font-semibold leading-none tracking-[-0.05em] text-foreground">{value}</span>
                        {suffix && <span className="text-[12px] font-medium text-muted-foreground">{suffix}</span>}
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground">{detail}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <div className="mb-8 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
              <Card id="progress" className="rounded-[18px] border-border bg-white shadow-none">
                <CardHeader className="flex flex-row items-start justify-between gap-4 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
                  <div>
                    <CardTitle className="text-[15px] font-semibold tracking-[-0.025em]">Confidence, over time</CardTitle>
                    <CardDescription className="mt-1 text-[11px] text-muted-foreground">Your session scores from the past 8 weeks</CardDescription>
                  </div>
                  <button type="button" className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted" aria-label="Chart period: past 8 weeks">
                    8 weeks <ChevronDown aria-hidden="true" className="size-3" />
                  </button>
                </CardHeader>
                <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
                  <ProgressChart />
                </CardContent>
              </Card>

              <Card className="rounded-[18px] border-primary-border bg-primary-soft shadow-none">
                <CardHeader className="px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
                  <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-white/80 text-primary">
                    <Sparkles aria-hidden="true" className="size-[17px]" strokeWidth={1.8} />
                  </div>
                  <CardTitle className="text-[15px] font-semibold tracking-[-0.025em]">A good next step</CardTitle>
                  <CardDescription className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Based on your recent practice</CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                  <p className="text-[13px] leading-[1.75] text-muted-foreground">Your answers are getting more concise. Try adding one specific example to your next interview response to make your impact even clearer.</p>
                  <div className="mt-4 flex items-start gap-2.5 border-t border-primary-border pt-4">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/80 text-primary"><Check aria-hidden="true" className="size-3" /></span>
                    <p className="text-[10px] leading-relaxed text-muted-foreground">Try the STAR method: situation, task, action, result.</p>
                  </div>
                  <a href="#practice" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary-hover">Practice an interview <ArrowRight aria-hidden="true" className="size-3.5" /></a>
                </CardContent>
              </Card>
            </div>

            <section id="sessions" aria-labelledby="sessions-heading" className="rounded-[18px] border border-border bg-white">
              <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-6">
                <div>
                  <h2 id="sessions-heading" className="text-[15px] font-semibold tracking-[-0.025em]">Recent sessions</h2>
                  <p className="mt-1 text-[11px] text-muted-foreground">A little better every time.</p>
                </div>
                <a href="#sessions" className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-hover">View all <ArrowRight aria-hidden="true" className="size-3.5" /></a>
              </div>
              <div className="hidden grid-cols-[1.15fr_1fr_0.7fr_0.45fr_auto] gap-4 border-y border-border bg-muted px-6 py-2.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-muted-foreground md:grid">
                <span>Session</span><span>Focus</span><span>Date</span><span>Score</span><span className="sr-only">Feedback</span>
              </div>
              <div className="divide-y divide-border">
                {sessions.map((session) => (
                  <div key={`${session.type}-${session.date}`} className="grid gap-3 px-5 py-4 md:grid-cols-[1.15fr_1fr_0.7fr_0.45fr_auto] md:items-center md:gap-4 md:px-6">
                    <div className="flex items-center gap-3">
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${session.tone === 'Interview' ? 'bg-white/80 text-info' : 'bg-primary-soft text-primary'}`}>
                        {session.tone === 'Interview' ? <MessageSquareText aria-hidden="true" className="size-4" strokeWidth={1.8} /> : <Mic2 aria-hidden="true" className="size-4" strokeWidth={1.8} />}
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold text-foreground">{session.type}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground md:hidden">{session.focus} · {session.date}</p>
                      </div>
                    </div>
                    <span className="hidden text-[11px] text-muted-foreground md:block">{session.focus}</span>
                    <span className="hidden text-[11px] text-muted-foreground md:block">{session.date}</span>
                    <span className="flex items-center gap-1 text-[12px] font-semibold text-foreground">{session.score}<span className="text-[10px] font-normal text-muted-foreground">/100</span></span>
                    <Button variant="outline" size="sm" className="w-fit rounded-lg border-border bg-white text-[10px] font-medium text-muted-foreground shadow-none hover:bg-muted">
                      View feedback <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="border-t border-border px-5 py-3.5 text-center sm:px-6">
                <a href="#sessions" className="text-[10px] font-medium text-muted-foreground hover:text-muted-foreground">You&apos;ve completed 24 sessions so far</a>
              </div>
            </section>

            <footer className="mt-6 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>One conversation at a time.</span>
              <span className="hidden sm:inline-flex items-center gap-1.5"><ArrowDownRight aria-hidden="true" className="size-3" /> Keep showing up</span>
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}
