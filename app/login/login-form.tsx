'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { useAccount } from '@/app/account-provider'
import { sessionApiEnabled, signIn } from '@/lib/practice-session-api'

const inputClass = 'mt-2 block min-h-12 w-full rounded-xl border border-input bg-background px-3 text-start text-base focus-visible:outline-2 focus-visible:outline-offset-2'

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
    <main lang={english ? 'en' : 'ar'} dir={english ? 'ltr' : 'rtl'} className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <section aria-labelledby="login-title" className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
        <header className="bg-sidebar px-6 py-7 text-sidebar-foreground sm:px-8">
          <p className="mb-3 text-lg font-semibold text-sidebar-highlight">{english ? 'Taleeq' : 'طليق'}</p>
          <h1 id="login-title" className="text-3xl font-semibold">{english ? 'Sign in' : 'تسجيل الدخول'}</h1>
        </header>

        <div className="p-6 sm:p-8">
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
                <input name="password" type="password" autoComplete="current-password" dir="ltr" required className={inputClass} />
              </label>
              {failed && (
                <p role="alert" className="text-sm text-destructive">
                  {english ? 'Could not sign in. Check your account details and try again.' : 'تعذّر تسجيل الدخول. تحقّق من بيانات حسابك وحاول مرة أخرى.'}
                </p>
              )}
              <button type="submit" disabled={!ready || signingIn} className="min-h-12 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">
                {signingIn ? (english ? 'Signing in…' : 'جارٍ تسجيل الدخول…') : (english ? 'Sign in' : 'دخول')}
              </button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">{english ? 'Sign-in is unavailable in this environment.' : 'تسجيل الدخول غير متاح في هذه النسخة.'}</p>
          )}

          <Link href="/" className="mt-6 inline-flex min-h-10 items-center rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
            {english ? 'Back to the dashboard' : 'العودة إلى لوحة التحكم'}
          </Link>
        </div>
      </section>
    </main>
  )
}
