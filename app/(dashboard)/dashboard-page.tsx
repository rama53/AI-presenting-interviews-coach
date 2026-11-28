'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAccount } from '@/app/account-provider'
import { loadRecentSessions, sessionApiEnabled } from '@/lib/practice-session-api'
import { ArrowRight, AudioLines, MessageSquareText } from 'lucide-react'
import { copy, type Language } from './copy'
import { LanguageSelect } from './language-select'
import { TrainingCharts } from './training-charts'
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
  const { account, setAccount } = useAccount()
  const [historyStatus, setHistoryStatus] = useState<'loading' | 'ready' | 'error'>('ready')
  const practiceTrigger = useRef<PracticeId | null>(null)
  const ar = language === 'ar'
  const needsSignIn = sessionApiEnabled && !account
  const historyMessage = sessionApiEnabled
    ? needsSignIn ? (ar ? 'سجّل الدخول لعرض جلساتك.' : 'Sign in to view your sessions.')
      : historyStatus === 'loading' ? (ar ? 'جارٍ تحميل الجلسات…' : 'Loading sessions…')
      : historyStatus === 'error' ? (ar ? 'تعذّر تحميل الجلسات.' : 'Could not load sessions.')
      : undefined
    : undefined

  useEffect(() => {
    if (!sessionApiEnabled) setSessions(readSessions())
    try {
      if (localStorage.getItem(languageKey) === 'en') setLanguage('en')
    } catch {
      // The language switch still works for the current visit.
    }
  }, [])

  useEffect(() => {
    if (!account || selectedPractice) return
    const controller = new AbortController()
    setHistoryStatus('loading')
    loadRecentSessions(account.token, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
      .then(records => {
        if (controller.signal.aborted) return
        setSessions(records)
        setHistoryStatus('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistoryStatus('error')
      })
    return () => controller.abort()
  }, [account, selectedPractice])

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
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-8 sm:py-8">
        <div className="mb-4 flex justify-end">{languageSelect}</div>
        <PracticeSession
          practice={{ ...text.modes[selectedPractice.id], defaultMinutes: selectedPractice.defaultMinutes }}
          text={text}
          language={language}
          isInterview={selectedPractice.id === 'interview'}
          accessToken={account?.token ?? null}
          onClose={() => setSelectedPractice(null)}
          onComplete={(interviewType) => {
            if (!sessionApiEnabled) setSessions(saveSession(selectedPractice.id, sessions, interviewType))
          }}
        />
      </main>
    )
  }

  return (
    <div id="dashboard" className="min-h-screen bg-[#faf7f1] text-foreground lg:flex">
      <DashboardSidebar text={text}>
        {languageSelect}
        {sessionApiEnabled && (
          account ? (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <bdi className="max-w-full truncate text-xs text-muted-foreground">{account.email}</bdi>
              <button
                type="button"
                onClick={() => { setAccount(null); setSessions([]); setHistoryStatus('ready') }}
                className="min-h-9 text-sm font-semibold text-primary hover:underline"
              >
                {ar ? 'تسجيل الخروج' : 'Sign out'}
              </button>
            </div>
          ) : (
            <Link href="/login" className="inline-flex min-h-10 items-center rounded-lg border border-primary-border bg-card px-3 text-sm font-semibold text-primary hover:bg-primary-soft">
              {ar ? 'تسجيل الدخول' : 'Sign in'}
            </Link>
          )
        )}
      </DashboardSidebar>

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-8 sm:py-9 lg:py-12">
        <header className="relative isolate overflow-hidden rounded-[1.75rem] border border-[#ead6be] bg-[#f7e8d7] px-5 py-9 sm:px-10 sm:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute -end-20 -top-32 -z-10 size-96 rounded-full border border-[#dc9b69]/35 bg-[#f7d4b5]/60 shadow-[0_0_0_2rem_#fff8ef70,0_0_0_4rem_#fff8ef40]" />
          {ar ? (
            <h1 className="dashboard-calligraphy max-w-[44rem]" aria-label={text.title.map((line) => line.join(' ')).join('، ')}>
              {text.title.map((line) => (
                <span
                  key={line[0]}
                  aria-hidden="true"
                  className="dashboard-verse home-verse bg-sidebar"
                  style={{ maskImage: `url("${taleeqVerses.src}")` }}
                />
              ))}
            </h1>
          ) : (
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-sidebar sm:text-5xl">
              {text.title.map((line) => <span key={line[0]} className="block">{line.join(' ')}</span>)}
            </h1>
          )}
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#3f4d52]">
            {ar ? 'تدرّب على مقابلتك أو عرضك القادم، وارجع لجلساتك لتتابع تمرينك.' : 'Rehearse your next interview or presentation, then revisit your practice sessions.'}
          </p>
        </header>

        <section id="practice" aria-labelledby="practice-title" className="mt-8 scroll-mt-6">
          <h2 id="practice-title" className="mb-4 text-xl font-semibold sm:text-2xl">{text.options}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {practiceOptions.map((option) => {
              const Icon = option.icon
              const mode = text.modes[option.id]
              const titleId = `practice-${option.id}-title`
              const descriptionId = `practice-${option.id}-description`

              return (
                <li key={option.id} className="min-w-0">
                  <article className={`flex h-full flex-col rounded-2xl border p-5 sm:p-6 ${option.id === 'presentation' ? 'border-[#efd1b9] bg-[#fff3e8]' : 'border-[#d1dfd7] bg-[#eef5ef]'}`}>
                    <div className="flex items-start gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-sidebar">
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
                      disabled={needsSignIn}
                      aria-labelledby={`${titleId} choose-${option.id}-label`}
                      aria-describedby={descriptionId}
                      onClick={() => {
                        practiceTrigger.current = option.id
                        setSelectedPractice(option)
                      }}
                      className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-sidebar/20 bg-white/65 px-4 py-2.5 text-sm font-semibold text-sidebar transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                    >
                      <span id={`choose-${option.id}-label`}>{text.startPractice}</span>
                      <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
                    </button>
                  </article>
                </li>
              )
            })}
          </ul>
          {needsSignIn && (
            <p className="mt-3 text-sm text-muted-foreground">
              <Link href="/login" className="font-semibold text-primary underline underline-offset-4">{ar ? 'سجّل الدخول لبدء التدريب' : 'Sign in to start practicing'}</Link>
            </p>
          )}
        </section>

        <TrainingCharts sessions={sessions} language={language} historyMessage={historyMessage} />

        <RecentSessions sessions={sessions} text={text} language={language} accessToken={account?.token}
          historyMessage={historyMessage}
        />

        <style jsx>{`
          @media (prefers-reduced-motion: no-preference) {
            .home-verse {
              animation: home-calligraphy-enter 850ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
            }

            .home-verse + .home-verse {
              animation-delay: 180ms;
            }

            @keyframes home-calligraphy-enter {
              from { opacity: 0; transform: translateY(0.55rem); }
              to { opacity: 1; transform: translateY(0); }
            }
          }
        `}</style>
      </main>
    </div>
  )
}


