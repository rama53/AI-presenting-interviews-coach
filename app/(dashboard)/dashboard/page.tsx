'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAccount } from '@/app/account-provider'
import { DashboardPage } from '../dashboard-page'

export default function DashboardRoute() {
  const router = useRouter()
  const { account, checkingAccount, setAccount } = useAccount()

  useEffect(() => {
    if (!checkingAccount && !account) router.replace('/')
  }, [account, checkingAccount, router])

  if (checkingAccount || !account) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <p role="status" className="text-sm text-muted-foreground">جارٍ التحقق من تسجيل الدخول…</p>
      </main>
    )
  }

  return <DashboardPage account={account} onSignOut={() => setAccount(null)} />
}
