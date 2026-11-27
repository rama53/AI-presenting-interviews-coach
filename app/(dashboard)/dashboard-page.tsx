'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, AudioLines, MessageSquareText } from 'lucide-react'
import { copy, type Language } from './copy'
import { LanguageSelect } from './language-select'
import { DashboardSidebar } from './dashboard-sidebar'
import { RecentSessions, readSessions, saveSession, type PracticeId, type SessionRecord } from './recent-sessions'
import { PracticeSession } from './practice-session'
import taleeqVerses from './taleeq-verses.png'

const practiceOptions = [
  { id: 'presentation', defaultMinutes: 3, icon: AudioLines },
  { id: 'interview', defaultMinutes: 2, icon: MessageSquareText },
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
          onClose={() => setSelectedPractice(null)}
          onComplete={() => setSessions(saveSession(selectedPractice.id, sessions))}
        />
      </main>
    )
  }

  return (
    <div id="dashboard" className="dashboard-waves min-h-screen bg-background text-foreground lg:flex">
      <DashboardSidebar text={text}>{languageSelect}</DashboardSidebar>

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-8 sm:py-9 lg:py-12">
        <header className="px-1 pt-6 pb-4 text-center sm:px-8 sm:pt-9 sm:pb-5">
          {language === 'ar' ? (
            <h1 className="mx-auto max-w-3xl" aria-label={text.title.map((line) => line.join(' ')).join('، ')}>
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
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-loose text-muted-foreground sm:text-base">{text.intro}</p>
          <p className="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">{text.demoNotice}</p>
        </header>

        <section id="practice" aria-labelledby="practice-title" className="mt-6 scroll-mt-6 rounded-3xl border border-border bg-card">
          <h2 id="practice-title" className="px-5 pb-3 pt-5 text-lg font-semibold sm:px-7 sm:pt-6 sm:text-xl">
            {text.options}
          </h2>
          <ul className="divide-y divide-border">
            {practiceOptions.map((option) => {
              const Icon = option.icon
              const mode = text.modes[option.id]
              const titleId = `practice-${option.id}-title`
              const descriptionId = `practice-${option.id}-description`

              return (
                <li key={option.id} className="last:[&>button]:rounded-b-3xl">
                  <button
                    type="button"
                    id={`choose-${option.id}`}
                    aria-labelledby={titleId}
                    aria-describedby={descriptionId}
                    onClick={() => {
                      practiceTrigger.current = option.id
                      setSelectedPractice(option)
                    }}
                    className="flex w-full items-center gap-3 px-5 py-4 text-start transition-colors hover:bg-primary-soft focus-visible:bg-primary-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:gap-4 sm:px-7"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span id={titleId} className="block font-semibold">{mode.title}</span>
                      <span id={descriptionId} className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">{mode.description}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-primary rtl:rotate-180" />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <RecentSessions sessions={sessions} text={text} language={language} />
      </main>
    </div>
  )
}
