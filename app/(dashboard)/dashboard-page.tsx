'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, AudioLines, Lightbulb, MessageSquareText, Sparkles } from 'lucide-react'
import { copy, type Language } from './copy'
import { LanguageSelect } from './language-select'
import { DashboardSidebar } from './dashboard-sidebar'
import { RecentSessions, readSessions, saveSession, type PracticeId, type SessionRecord } from './recent-sessions'
import { PracticeSession } from './practice-session'
import taleeqVerses from './taleeq-verses.png'

const practiceOptions = [
  { id: 'presentation', defaultMinutes: 3, icon: AudioLines },
  { id: 'interview', defaultMinutes: 10, icon: MessageSquareText },
] as const

const languageKey = 'speakwell.language'

export function DashboardPage() {
  const [selectedPractice, setSelectedPractice] = useState<(typeof practiceOptions)[number] | null>(null)
  const [language, setLanguage] = useState<Language>('ar')
  const text = copy[language]
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const practiceTrigger = useRef<PracticeId | null>(null)

  useEffect(() => {
    setSessions(readSessions())
    try {
      if (localStorage.getItem(languageKey) === 'en') setLanguage('en')
    } catch {
      // The language switch still works for the current visit.
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.title = copy[language].pageTitle
  }, [language])

  function changeLanguage(value: Language) {
    setLanguage(value)
    try {
      localStorage.setItem(languageKey, value)
    } catch {
      // Keep the selected language in memory when storage is unavailable.
    }
  }

  const languageSelect = <LanguageSelect label={text.language} language={language} onChange={changeLanguage} />

  useEffect(() => {
    if (selectedPractice === null && practiceTrigger.current) {
      document.getElementById(`choose-${practiceTrigger.current}`)?.focus()
      practiceTrigger.current = null
    }
  }, [selectedPractice])

  if (selectedPractice) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-4 flex justify-end">{languageSelect}</div>
        <PracticeSession
          practice={{ ...text.modes[selectedPractice.id], defaultMinutes: selectedPractice.defaultMinutes }}
          text={text}
          isInterview={selectedPractice.id === 'interview'}
          onClose={() => setSelectedPractice(null)}
          onComplete={(interviewType) => setSessions(saveSession(selectedPractice.id, sessions, interviewType))}
        />
      </main>
    )
  }

  return (
    <div id="dashboard" className="dashboard-waves min-h-screen bg-background text-foreground lg:flex">
      <DashboardSidebar text={text}>{languageSelect}</DashboardSidebar>

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-8 sm:py-9 lg:py-12">
        <header className="px-1 pt-5 pb-3 text-center sm:px-8 sm:pt-7 sm:pb-5">
          {language === 'ar' ? (
            <h1 className="dashboard-calligraphy mx-auto max-w-3xl" aria-label={text.title.map((line) => line.join(' ')).join('، ')}>
              {text.title.map((line) => (
                <span
                  key={line[0]}
                  aria-hidden="true"
                  className="dashboard-verse bg-sidebar"
                  style={{ maskImage: `url("${taleeqVerses.src}")` }}
                />
              ))}
            </h1>
          ) : (
            <h1 className="text-3xl font-semibold leading-tight text-sidebar sm:text-5xl">
              {text.title.map((line) => <span key={line[0]} className="block">{line.join(' ')}</span>)}
            </h1>
          )}
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-5 sm:text-base">{text.intro}</p>
          <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">{text.demoNotice}</p>
        </header>

        <section aria-labelledby="performance-title" className="mt-5 scroll-mt-6">
          <div className="mb-3 flex items-center gap-2 px-1">
            <Sparkles aria-hidden="true" className="size-4 text-primary" />
            <h2 id="performance-title" className="text-base font-semibold sm:text-lg">{text.performance}</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">{text.totalSessions}</p>
              <p className="mt-2 flex items-baseline gap-2 text-2xl font-semibold tabular-nums">
                <bdi dir="ltr">{sessions.length}</bdi>
                <span className="text-xs font-normal text-muted-foreground">{text.completedSessions}</span>
              </p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">{text.averageScore}</p>
              <p className="mt-2 text-lg font-semibold">{text.scoreUnavailable}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text.scoreUnavailableNote}</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">{text.improvement}</p>
              <p className="mt-2 text-lg font-semibold">{text.scoreUnavailable}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text.improvementUnavailableNote}</p>
            </article>
          </div>
        </section>

        <section id="practice" aria-labelledby="practice-title" className="mt-7 scroll-mt-6">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 id="practice-title" className="text-lg font-semibold sm:text-xl">{text.options}</h2>
            <span className="hidden text-xs text-muted-foreground sm:inline">{text.practice}</span>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {practiceOptions.map((option) => {
              const Icon = option.icon
              const mode = text.modes[option.id]
              const titleId = `practice-${option.id}-title`
              const descriptionId = `practice-${option.id}-description`

              return (
                <li key={option.id} className="min-w-0">
                  <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary-border sm:p-6">
                    <div className="flex items-start gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 id={titleId} className="text-base font-semibold sm:text-lg">{mode.title}</h3>
                        <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-muted-foreground">{mode.description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      id={`choose-${option.id}`}
                      aria-labelledby={`${titleId} choose-${option.id}-label`}
                      aria-describedby={descriptionId}
                      onClick={() => {
                        practiceTrigger.current = option.id
                        setSelectedPractice(option)
                      }}
                      className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <span id={`choose-${option.id}-label`}>{text.startPractice}</span>
                      <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
                    </button>
                  </article>
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="recommendation-title" className="mt-5 rounded-2xl border border-primary-border bg-primary-soft/70 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-primary">
              <Lightbulb aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-primary">{text.recommendation}</p>
              <h2 id="recommendation-title" className="mt-1 font-semibold">
                {sessions[0]?.practice === 'presentation'
                  ? text.recommendationPresentationTitle
                  : sessions[0]?.practice === 'interview'
                    ? text.recommendationInterviewTitle
                    : text.recommendationNewTitle}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {sessions[0]?.practice === 'presentation'
                  ? text.recommendationPresentationDescription
                  : sessions[0]?.practice === 'interview'
                    ? text.recommendationInterviewDescription
                    : text.recommendationNewDescription}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const recommendedId = sessions[0]?.practice === 'presentation'
                ? 'interview'
                : sessions[0]?.practice === 'interview'
                  ? 'presentation'
                  : 'interview'
              const option = practiceOptions.find((item) => item.id === recommendedId)!
              practiceTrigger.current = option.id
              setSelectedPractice(option)
            }}
            className="mt-4 inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:mt-0"
          >
            {text.startPractice}
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </button>
        </section>

        <RecentSessions sessions={sessions} text={text} language={language} />
      </main>
    </div>
  )
}
