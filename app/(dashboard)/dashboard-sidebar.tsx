'use client'

import { useState } from 'react'
import {
  ArrowUpRight,
  BookOpenCheck,
  ChartNoAxesColumnIncreasing,
  Clock3,
  LayoutDashboard,
  Menu,
  Settings2,
  X,
} from 'lucide-react'

const navigation = [
  { label: 'Dashboard', href: '#dashboard', icon: LayoutDashboard },
  { label: 'Practice', href: '#practice', icon: BookOpenCheck },
  { label: 'Session History', href: '#sessions', icon: Clock3 },
  { label: 'My Progress', href: '#progress', icon: ChartNoAxesColumnIncreasing },
  { label: 'Settings', href: '#settings', icon: Settings2 },
]

export function DashboardSidebar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <aside className="hidden min-h-screen w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-5 py-7 lg:flex">
        <a href="#dashboard" className="mb-12 flex items-center gap-3 px-2" aria-label="Speakwell home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <span className="size-2.5 rounded-full bg-sidebar-primary-foreground" />
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.04em] text-sidebar-foreground">speakwell</span>
        </a>

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-sidebar-muted">Workspace</p>
        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          {navigation.map(({ label, href, icon: Icon }, index) => (
            <a
              key={label}
              href={href}
              aria-current={index === 0 ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${index === 0 ? 'bg-sidebar-accent text-sidebar-highlight' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}
            >
              <Icon aria-hidden="true" className="size-[17px]" strokeWidth={1.8} />
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent p-4" id="settings">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-accent-foreground" aria-label="Maya Chen">
              MC
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-sidebar-foreground">Maya Chen</p>
              <p className="truncate text-[11px] text-sidebar-muted">Student plan</p>
            </div>
            <ArrowUpRight aria-hidden="true" className="ml-auto size-4 text-sidebar-muted" />
          </div>
        </div>
      </aside>

      <div className="fixed inset-x-0 top-0 z-20 flex w-full items-center justify-between border-b border-sidebar-border bg-sidebar/95 px-5 py-3 backdrop-blur lg:hidden">
        <a href="#dashboard" className="flex items-center gap-2.5" aria-label="Speakwell home">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <span className="size-2 rounded-full bg-sidebar-primary-foreground" />
          </span>
          <span className="text-[16px] font-semibold tracking-[-0.04em] text-sidebar-foreground">speakwell</span>
        </a>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          className="flex size-10 items-center justify-center rounded-xl text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
        >
          {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
        {menuOpen && (
          <nav aria-label="Main navigation" className="absolute inset-x-0 top-full flex flex-col gap-1 border-b border-sidebar-border bg-sidebar px-4 py-3 shadow-sm">
            {navigation.map(({ label, href, icon: Icon }, index) => (
              <a
                key={label}
                href={href}
                aria-current={index === 0 ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium ${index === 0 ? 'bg-sidebar-accent text-sidebar-highlight' : 'text-sidebar-muted hover:bg-sidebar-accent'}`}
              >
                <Icon aria-hidden="true" className="size-[17px]" strokeWidth={1.8} />
                {label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </>
  )
}
