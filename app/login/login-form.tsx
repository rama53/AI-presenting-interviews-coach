'use client'

import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { useAccount } from '@/app/account-provider'
import { sessionApiEnabled, signIn } from '@/lib/practice-session-api'
import taleeqLogo from '../(dashboard)/taleeq-logo.png'

const inputClass = 'block min-h-[3.25rem] w-full rounded-xl border border-input bg-white ps-11 pe-4 text-start text-base text-sidebar shadow-sm transition-colors hover:border-primary-border focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const inputIconClass = 'pointer-events-none absolute start-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-muted-foreground'

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
      className="login-background grid min-h-dvh place-items-center bg-sidebar px-4 py-10 sm:px-6 sm:py-12"
    >
      <div className="flex w-full max-w-[28rem] flex-col items-center gap-8 sm:gap-10">
        <div className="login-logo">
          <Image
            src={taleeqLogo}
            alt={english ? 'Taleeq' : 'طليق'}
            className="h-auto w-48 scale-x-105 brightness-0 invert sm:w-56"
            loading="eager"
          />
        </div>

        <section
          aria-labelledby="login-title"
          className="login-card relative w-full rounded-[1.75rem] border border-white/70 bg-card px-6 pb-6 pt-8 shadow-[0_32px_76px_-32px_rgba(4,10,20,0.9)] sm:px-10 sm:pb-8 sm:pt-10"
        >
          <div aria-hidden="true" className="mb-4 h-1 w-9 rounded-full bg-sidebar-highlight" />
          <h1 id="login-title" className="mb-7 text-[1.875rem] font-semibold leading-tight text-sidebar">
            {english ? 'Sign in' : 'تسجيل الدخول'}
          </h1>

          {account ? (
            <p className="text-sm">{english ? 'Signed in as' : 'الحساب الحالي'} <bdi>{account.email}</bdi></p>
          ) : sessionApiEnabled ? (
            <form onSubmit={handleSubmit} className="grid gap-5" aria-busy={signingIn}>
              <label className="grid gap-2 text-sm font-semibold text-sidebar">
                {english ? 'Email' : 'البريد الإلكتروني'}
                <span className="relative block" dir="ltr">
                  <Mail aria-hidden="true" className={inputIconClass} />
                  <input name="email" type="email" autoComplete="username" dir="ltr" disabled={!ready || signingIn} required className={inputClass} />
                </span>
              </label>
              <label className="text-sm font-medium">
                {english ? 'Password' : 'كلمة المرور'}
                <span className="relative block" dir="ltr">
                  <LockKeyhole aria-hidden="true" className={inputIconClass} />
                  <input name="password" type="password" autoComplete="current-password" dir="ltr" disabled={!ready || signingIn} required className={inputClass} />
                </span>
              </label>
              {failed && (
                <p role="alert" className="text-sm text-destructive">
                  {english ? 'Could not sign in. Check your account details and try again.' : 'تعذّر تسجيل الدخول. تحقّق من بيانات حسابك وحاول مرة أخرى.'}
                </p>
              )}
              <button type="submit" disabled={!ready || signingIn} className="mt-2 min-h-[3.25rem] rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-[0_6px_16px_-8px_var(--primary)] transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">
                {signingIn ? (english ? 'Signing in…' : 'جارٍ تسجيل الدخول…') : (english ? 'Sign in' : 'تسجيل الدخول')}
              </button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">{english ? 'Sign-in is unavailable in this environment.' : 'تسجيل الدخول غير متاح في هذه النسخة.'}</p>
          )}

          <Link href="/" className="mt-6 flex min-h-10 items-center justify-center gap-2 border-t border-border pt-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2">
            <ArrowRight aria-hidden="true" className="size-4 ltr:rotate-180" />
            {english ? 'Back to the dashboard' : 'العودة إلى لوحة التحكم'}
          </Link>
        </section>
      </div>

      <style jsx>{`
        .login-background {
          background-image:
            radial-gradient(ellipse at 87% 14%, rgba(203, 105, 61, 0.21), transparent 41%),
            radial-gradient(ellipse at 15% 80%, rgba(57, 104, 150, 0.28), transparent 48%),
            linear-gradient(150deg, #192c46 0%, #111f33 76%);
        }

        @media (prefers-reduced-motion: no-preference) {
          .login-logo {
            animation: login-logo-rise 1400ms cubic-bezier(0.45, 0, 0.24, 1) both;
          }

          .login-card {
            animation: login-card-enter 620ms ease-out 1320ms both;
          }

          @keyframes login-logo-rise {
            0%, 26% {
              transform: translateY(clamp(5rem, 20vh, 11rem));
            }

            100% {
              transform: translateY(0);
            }
          }

          @keyframes login-card-enter {
            from {
              opacity: 0;
              transform: translateY(1.5rem);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        }
      `}</style>
    </main>
  )
}
