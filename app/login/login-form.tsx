'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { useAccount } from '@/app/account-provider'
import { sessionApiEnabled, signIn } from '@/lib/practice-session-api'
import taleeqLogo from '../(dashboard)/taleeq-logo.png'

const inputClass = 'mt-2 block min-h-12 w-full rounded-xl border border-input bg-background px-4 text-start text-base transition-colors hover:border-primary-border focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function LoginForm() {
  const router = useRouter()
  const { account, setAccount } = useAccount()
  const [ready, setReady] = useState(false)
  const [english, setEnglish] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setReady(true)
    try {
      setEnglish(localStorage.getItem('speakwell.language') === 'en')
    } catch {
      // Use the default language if browser storage is unavailable.
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sessionApiEnabled || signingIn || account) return

    const fields = new FormData(event.currentTarget)
    const email = String(fields.get('email') ?? '').trim()
    setSigningIn(true)
    setFailed(false)
    try {
      const token = await signIn(email, String(fields.get('password') ?? ''))
      setAccount({ email, token })
      router.replace('/')
    } catch {
      setFailed(true)
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <main
      lang={english ? 'en' : 'ar'}
      dir={english ? 'ltr' : 'rtl'}
      className="grid min-h-dvh place-items-center bg-sidebar px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="flex w-full max-w-[26rem] flex-col items-center gap-7 sm:gap-9">
        <Image
          src={taleeqLogo}
          alt={english ? 'Taleeq' : 'طليق'}
          className="h-auto w-32 brightness-0 invert sm:w-40"
          loading="eager"
        />

        <section
          aria-labelledby="login-title"
          className="w-full rounded-[2rem] border border-border bg-card px-6 py-7 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.65)] sm:px-9 sm:py-9"
        >
          <h1 id="login-title" className="mb-7 text-center text-[1.75rem] font-semibold leading-tight text-sidebar">
            {english ? 'Sign in' : 'تسجيل الدخول'}
          </h1>

          {account ? (
            <p className="text-sm">{english ? 'Signed in as' : 'الحساب الحالي'} <bdi>{account.email}</bdi></p>
          ) : sessionApiEnabled ? (
            <form onSubmit={handleSubmit} className="grid gap-5" aria-busy={signingIn}>
              <label className="text-sm font-medium">
                {english ? 'Email' : 'البريد الإلكتروني'}
                <input name="email" type="email" autoComplete="username" dir="ltr" disabled={!ready || signingIn} required className={inputClass} />
              </label>
              <label className="text-sm font-medium">
                {english ? 'Password' : 'كلمة المرور'}
                <input name="password" type="password" autoComplete="current-password" dir="ltr" disabled={!ready || signingIn} required className={inputClass} />
              </label>
              {failed && (
                <p role="alert" className="text-sm text-destructive">
                  {english ? 'Could not sign in. Check your account details and try again.' : 'تعذّر تسجيل الدخول. تحقّق من بيانات حسابك وحاول مرة أخرى.'}
                </p>
              )}
              <button type="submit" disabled={!ready || signingIn} className="mt-1 min-h-12 rounded-xl bg-sidebar px-4 font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar disabled:opacity-60">
                {signingIn ? (english ? 'Signing in…' : 'جارٍ تسجيل الدخول…') : (english ? 'Sign in' : 'تسجيل الدخول')}
              </button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">{english ? 'Sign-in is unavailable in this environment.' : 'تسجيل الدخول غير متاح في هذه النسخة.'}</p>
          )}

          <Link href="/" className="mt-6 flex min-h-10 items-center justify-center border-t border-border pt-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-sidebar focus-visible:outline-2 focus-visible:outline-offset-2">
            {english ? 'Back to the dashboard' : 'العودة إلى لوحة التحكم'}
          </Link>
        </section>
      </div>
    </main>
  )
}
