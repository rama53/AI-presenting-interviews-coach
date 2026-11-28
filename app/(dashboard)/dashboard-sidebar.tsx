import Image from 'next/image'
import type { ReactNode } from 'react'
import { AudioLines, History, LayoutDashboard } from 'lucide-react'
import type { DashboardCopy } from './copy'
import taleeqLogo from './taleeq-logo.png'

const navigation = [
  { label: 'overview', href: '#dashboard', icon: LayoutDashboard },
  { label: 'practice', href: '#practice', icon: AudioLines },
  { label: 'recent', href: '#recent-sessions', icon: History },
] as const

export function DashboardSidebar({ text, children }: { text: DashboardCopy; children: ReactNode }) {
  return (
    <aside className="border-b border-border bg-[#fffaf3] px-4 py-4 text-sidebar sm:px-8 lg:w-52 lg:shrink-0 lg:border-b-0 lg:border-e lg:px-5 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 lg:sticky lg:top-8 lg:block">
        <a href="#dashboard" className="block w-fit" lang="ar">
          <Image src={taleeqLogo} alt="طليق" className="h-auto w-24 lg:w-28" />
        </a>

        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:mt-6 lg:flex-col lg:items-start">{children}</div>

        <nav aria-label={text.navigation} className="flex w-full flex-wrap gap-1 lg:mt-6 lg:flex-col">
          {navigation.map(({ label, href, icon: Icon }) => (
            <a key={href} href={href} className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
              <Icon aria-hidden="true" className="size-4" />
              {text[label]}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
