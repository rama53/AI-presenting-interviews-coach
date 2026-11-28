'use client'

import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { useAccount } from '@/app/account-provider'
import { sessionApiEnabled, signIn } from '@/lib/practice-session-api'
import taleeqLogo from '../(dashboard)/taleeq-logo.png'

const inputClass = 'block min-h-[3.25rem] w-full rounded-xl border border-white/15 bg-[#101e31]/55 ps-11 pe-4 text-start text-base text-white transition-colors hover:border-white/30 focus-visible:border-sidebar-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-highlight'
const inputIconClass = 'pointer-events-none absolute start-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-sidebar-muted'

// Crop individual marks from the existing Taleeq artwork.
const shadda = [150, 625, 135, 145] as const
const curvedMark = [956, 302, 66, 152] as const
const stroke = [1167, 340, 218, 135] as const
const dots = [305, 468, 188, 130] as const
const edgeMarks = [shadda, stroke, curvedMark, dots, shadda, stroke] as const

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
      className="login-background relative isolate grid min-h-dvh place-items-center bg-sidebar px-4 py-10 sm:px-6 sm:py-12"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="login-dust login-dust-warm" />
        <div className="login-dust login-dust-cool" />
        <div className="login-marks">
          {edgeMarks.map(([x, y, width, height], index) => (
            <span
              key={index}
              className="login-mark"
              style={{
                aspectRatio: width / height,
                maskImage: `url("${taleeqLogo.src}")`,
                maskSize: `${taleeqLogo.width / width * 100}% ${taleeqLogo.height / height * 100}%`,
                maskPosition: `${x / (taleeqLogo.width - width) * 100}% ${y / (taleeqLogo.height - height) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-[28rem] flex-col items-center gap-8 sm:gap-10">
        <div className="login-logo">
          <Image
            src={taleeqLogo}
            alt={english ? 'Taleeq' : 'طليق'}
            className="h-auto w-48 scale-x-[1.22] brightness-0 invert sm:w-56"
            loading="eager"
          />
        </div>

        <section
          aria-labelledby="login-title"
          className="login-card relative w-full rounded-[1.75rem] px-6 pb-6 pt-8 text-sidebar-foreground sm:px-10 sm:pb-8 sm:pt-10"
        >
          <div aria-hidden="true" className="mb-4 h-0.5 w-7 rounded-full bg-sidebar-highlight/80" />
          <h1 id="login-title" className="mb-7 text-[1.875rem] font-semibold leading-tight text-white">
            {english ? 'Sign in' : 'تسجيل الدخول'}
          </h1>

          {account ? (
            <p className="text-sm">{english ? 'Signed in as' : 'الحساب الحالي'} <bdi>{account.email}</bdi></p>
          ) : sessionApiEnabled ? (
            <form onSubmit={handleSubmit} className="grid gap-5" aria-busy={signingIn}>
              <label className="grid gap-2 text-sm font-semibold text-sidebar-foreground">
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
                <p role="alert" className="text-sm text-rose-200">
                  {english ? 'Could not sign in. Check your account details and try again.' : 'تعذّر تسجيل الدخول. تحقّق من بيانات حسابك وحاول مرة أخرى.'}
                </p>
              )}
              <button type="submit" disabled={!ready || signingIn} className="mt-2 min-h-[3.25rem] rounded-xl bg-sidebar-highlight px-4 font-semibold text-[#301a13] transition-colors hover:bg-[#ffc09d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-highlight disabled:opacity-60">
                {signingIn ? (english ? 'Signing in…' : 'جارٍ تسجيل الدخول…') : (english ? 'Sign in' : 'تسجيل الدخول')}
              </button>
            </form>
          ) : (
            <p className="text-sm text-sidebar-muted">{english ? 'Sign-in is unavailable in this environment.' : 'تسجيل الدخول غير متاح في هذه النسخة.'}</p>
          )}

          <Link href="/" className="mt-6 flex min-h-10 items-center justify-center gap-2 border-t border-white/10 pt-3 text-center text-sm font-medium text-sidebar-muted transition-colors hover:text-sidebar-highlight focus-visible:outline-2 focus-visible:outline-offset-2">
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

        .login-dust {
          position: absolute;
          aspect-ratio: 1;
          width: clamp(16rem, 52vw, 48rem);
        }

        .login-dust-warm {
          top: -23%;
          right: -12%;
          background:
            radial-gradient(circle at 39% 62%, #ffbf9b6b 0 1px, transparent 3px),
            radial-gradient(circle at 65% 49%, #ef96546b 0 2px, transparent 5px),
            radial-gradient(circle at 55% 74%, #e388473f 0 3px, transparent 8px),
            radial-gradient(circle at 72% 61%, #eda36950 0 1px, transparent 4px),
            radial-gradient(circle at 59% 52%, #c979492b 0%, transparent 58%),
            radial-gradient(circle at 35% 71%, #ce784b22 0%, transparent 32%);
        }

        .login-dust-cool {
          bottom: -29%;
          left: -13%;
          background:
            radial-gradient(circle at 61% 29%, #e8ad8756 0 1px, transparent 4px),
            radial-gradient(circle at 40% 47%, #91b1de6b 0 2px, transparent 6px),
            radial-gradient(circle at 73% 42%, #b0c7e33f 0 2px, transparent 6px),
            radial-gradient(circle at 48% 42%, #709bcc36 0%, transparent 57%);
        }

        .login-marks {
          position: absolute;
          inset: 0;
        }

        .login-mark {
          position: absolute;
          display: block;
          width: var(--mark-width);
          background: #ffa373;
          opacity: var(--mark-opacity);
          rotate: var(--mark-rotation);
          mask-repeat: no-repeat;
        }

        .login-mark:nth-child(1) {
          top: 18%;
          left: 11%;
          --mark-width: clamp(1.4rem, 3.3vw, 2.8rem);
          --mark-opacity: 0.84;
          --mark-rotation: -17deg;
        }

        .login-mark:nth-child(2) {
          top: 34%;
          left: 19%;
          --mark-width: clamp(1rem, 2.1vw, 1.8rem);
          --mark-opacity: 0.49;
          --mark-rotation: -22deg;
        }

        .login-mark:nth-child(3) {
          bottom: 19%;
          left: 13%;
          --mark-width: clamp(0.7rem, 1.7vw, 1.4rem);
          --mark-opacity: 0.7;
          --mark-rotation: 18deg;
        }

        .login-mark:nth-child(4) {
          top: 23%;
          right: 13%;
          --mark-width: clamp(1rem, 2.6vw, 2.2rem);
          --mark-opacity: 0.65;
          --mark-rotation: 10deg;
        }

        .login-mark:nth-child(5) {
          top: 48%;
          right: 9%;
          --mark-width: clamp(1.3rem, 3.1vw, 2.5rem);
          --mark-opacity: 0.8;
          --mark-rotation: 16deg;
        }

        .login-mark:nth-child(6) {
          bottom: 18%;
          right: 18%;
          --mark-width: clamp(1rem, 2.1vw, 1.8rem);
          --mark-opacity: 0.55;
          --mark-rotation: 10deg;
        }

        @media (max-width: 640px) {
          .login-mark:nth-child(1) { left: 5%; }
          .login-mark:nth-child(2) { top: 30%; left: 3%; }
          .login-mark:nth-child(3) { bottom: 9%; left: 5%; }
          .login-mark:nth-child(4) { right: 6%; }
          .login-mark:nth-child(5) { right: 3%; }
          .login-mark:nth-child(6) { bottom: 8%; right: 6%; }
        }

        .login-card {
          background: linear-gradient(180deg, rgba(73, 96, 126, 0.19), rgba(21, 37, 59, 0));
          box-shadow: inset 0 1px rgba(199, 217, 241, 0.15);
        }

        @media (prefers-reduced-motion: no-preference) {
          .login-dust,
          .login-mark {
            animation: login-background-drift 22s ease-in-out infinite alternate;
          }

          .login-dust-cool,
          .login-mark:nth-child(even) {
            animation-direction: alternate-reverse;
          }

          @keyframes login-background-drift {
            from {
              transform: translate(-0.6rem, 0.35rem);
            }

            to {
              transform: translate(1.1rem, -0.8rem);
            }
          }

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
