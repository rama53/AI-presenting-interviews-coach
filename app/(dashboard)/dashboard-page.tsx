'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, AudioLines, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

        <section id="practice" aria-label={text.options} className="mt-6 grid scroll-mt-6 gap-4 sm:grid-cols-2 lg:gap-5">
          {practiceOptions.map((option) => {
            const Icon = option.icon
            const mode = text.modes[option.id]
            return (
              <Card key={option.id} className="rounded-3xl border border-border bg-card p-0 shadow-sm ring-0">
                <CardContent className="flex h-full flex-col p-5 sm:p-7">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sidebar-highlight text-sidebar">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{mode.title}</h2>
                  </div>
                  <p className="mt-4 flex-1 text-sm leading-loose text-muted-foreground">{mode.description}</p>
                  <Button
                    size="lg"
                    type="button"
                    id={`choose-${option.id}`}
                    onClick={() => {
                      practiceTrigger.current = option.id
                      setSelectedPractice(option)
                    }}
                    className="mt-5 min-h-11 w-full justify-between gap-3 rounded-xl px-4 hover:bg-primary-hover"
                  >
                    {mode.action}<ArrowRight aria-hidden="true" data-icon="inline-end" className="rtl:rotate-180" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <RecentSessions sessions={sessions} text={text} language={language} />
      </main>
    </div>
  )
}
