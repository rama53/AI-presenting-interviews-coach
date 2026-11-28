import type { Metadata } from 'next'
import { LoginForm } from './login/login-form'

export const metadata: Metadata = {
  title: 'تسجيل الدخول | طليق',
}

export default function HomePage() {
  return <LoginForm />
}
