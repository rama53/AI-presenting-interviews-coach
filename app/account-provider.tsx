'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { validateSignIn, type SignedInAccount } from '@/lib/practice-session-api'

const storageKey = 'taleeq.account'

const AccountContext = createContext<{
  account: SignedInAccount | null
  checkingAccount: boolean
  setAccount: (account: SignedInAccount | null) => void
} | null>(null)

function readStoredAccount(): SignedInAccount | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
    if (saved && typeof saved.email === 'string' && typeof saved.token === 'string' &&
        saved.token && typeof saved.expiresAt === 'number' &&
        Number.isFinite(saved.expiresAt) && saved.expiresAt > Date.now()) {
      return { email: saved.email, token: saved.token, expiresAt: saved.expiresAt }
    }
  } catch {
    // Session storage may be unavailable.
  }
  return null
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, updateAccount] = useState<SignedInAccount | null>(null)
  const [checkingAccount, setCheckingAccount] = useState(true)

  const setAccount = useCallback((nextAccount: SignedInAccount | null) => {
    updateAccount(nextAccount)
    try {
      if (nextAccount) sessionStorage.setItem(storageKey, JSON.stringify(nextAccount))
      else sessionStorage.removeItem(storageKey)
    } catch {
      // The current page can continue with an in-memory session.
    }
  }, [])

  useEffect(() => {
    const saved = readStoredAccount()
    if (!saved) {
      setAccount(null)
      setCheckingAccount(false)
      return
    }

    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])
    void validateSignIn(saved.token, signal)
      .catch(() => false)
      .then(valid => {
        if (controller.signal.aborted) return
        setAccount(valid && saved.expiresAt > Date.now() ? saved : null)
        setCheckingAccount(false)
      })

    return () => controller.abort()
  }, [setAccount])

  useEffect(() => {
    if (!account) return
    function clearExpiredAccount() {
      if (account && account.expiresAt <= Date.now()) setAccount(null)
    }

    const timer = window.setTimeout(clearExpiredAccount, Math.max(0, account.expiresAt - Date.now()))
    document.addEventListener('visibilitychange', clearExpiredAccount)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', clearExpiredAccount)
    }
  }, [account, setAccount])

  return (
    <AccountContext.Provider value={{ account, checkingAccount, setAccount }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) throw new Error('useAccount requires AccountProvider')
  return context
}
