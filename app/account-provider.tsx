'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type Account = { email: string; token: string }

const AccountContext = createContext<{
  account: Account | null
  setAccount: (account: Account | null) => void
} | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)

  return (
    <AccountContext.Provider value={{ account, setAccount }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) throw new Error('useAccount requires AccountProvider')
  return context
}
