import type { ReactNode } from 'react'
import { AudioLines, History, LayoutDashboard } from 'lucide-react'
import type { DashboardCopy } from './copy'

const navigation = [
  { label: 'overview', href: '#dashboard', icon: LayoutDashboard },
  { label: 'practice', href: '#practice', icon: AudioLines },
  { label: 'recent', href: '#recent-sessions', icon: History },
] as const

export function DashboardSidebar({ text, children }: { text: DashboardCopy; children: ReactNode }) {
  return (
    <aside className="bg-sidebar px-4 py-4 sm:px-8 text-sidebar-foreground lg:w-60 lg:shrink-0 lg:px-5 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 lg:sticky lg:top-8 lg:block">
        <a href="#dashboard" className="flex w-fit items-center gap-3">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-sidebar-primary">
            <span className="size-2 rounded-full bg-sidebar-primary-foreground" />
          </span>
          <span lang="ar" dir="rtl" className="font-['Aref_Ruqaa',serif] text-4xl font-bold leading-tight text-sidebar-highlight">طليق</span>
        </a>

        <div className="lg:mt-6">{children}</div>

        <nav aria-label={text.navigation} className="flex w-full flex-wrap gap-1 lg:mt-6 lg:flex-col">
          {navigation.map(({ label, href, icon: Icon }) => (
            <a key={href} href={href} className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Icon aria-hidden="true" className="size-4" />
              {text[label]}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
