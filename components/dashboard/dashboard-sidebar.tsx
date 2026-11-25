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
      <aside className="hidden min-h-screen w-[248px] shrink-0 flex-col border-r border-[#e9e6e1] bg-[#fcfbf9] px-5 py-7 lg:flex">
        <a href="#dashboard" className="mb-12 flex items-center gap-3 px-2" aria-label="Speakwell home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#ede8f7] text-[#695592]">
            <span className="size-2.5 rounded-full bg-[#7963a6]" />
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.04em] text-[#292631]">speakwell</span>
        </a>

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#96919d]">Workspace</p>
        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          {navigation.map(({ label, href, icon: Icon }, index) => (
            <a
              key={label}
              href={href}
              aria-current={index === 0 ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${index === 0 ? 'bg-[#efebf7] text-[#584878]' : 'text-[#76727d] hover:bg-[#f3f1ee] hover:text-[#302d35]'}`}
            >
              <Icon aria-hidden="true" className="size-[17px]" strokeWidth={1.8} />
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-[#eae6e1] bg-white p-4" id="settings">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f0e5df] text-xs font-semibold text-[#795747]" aria-label="Maya Chen">
              MC
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-[#302d35]">Maya Chen</p>
              <p className="truncate text-[11px] text-[#96919d]">Student plan</p>
            </div>
            <ArrowUpRight aria-hidden="true" className="ml-auto size-4 text-[#aaa5ad]" />
          </div>
        </div>
      </aside>

      <div className="fixed inset-x-0 top-0 z-20 flex w-full items-center justify-between border-b border-[#e9e6e1] bg-[#fcfbf9]/95 px-5 py-3 backdrop-blur lg:hidden">
        <a href="#dashboard" className="flex items-center gap-2.5" aria-label="Speakwell home">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#ede8f7]">
            <span className="size-2 rounded-full bg-[#7963a6]" />
          </span>
          <span className="text-[16px] font-semibold tracking-[-0.04em] text-[#292631]">speakwell</span>
        </a>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          className="flex size-10 items-center justify-center rounded-xl text-[#615b68] hover:bg-[#f0edf4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7963a6]"
        >
          {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
        {menuOpen && (
          <nav aria-label="Main navigation" className="absolute inset-x-0 top-full flex flex-col gap-1 border-b border-[#e9e6e1] bg-[#fcfbf9] px-4 py-3 shadow-sm">
            {navigation.map(({ label, href, icon: Icon }, index) => (
              <a
                key={label}
                href={href}
                aria-current={index === 0 ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium ${index === 0 ? 'bg-[#efebf7] text-[#584878]' : 'text-[#76727d] hover:bg-[#f3f1ee]'}`}
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
