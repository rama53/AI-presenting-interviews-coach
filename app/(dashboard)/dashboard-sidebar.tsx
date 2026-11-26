import { AudioLines, History, LayoutDashboard } from 'lucide-react'

const navigation = [
  { label: 'Overview', href: '#dashboard', icon: LayoutDashboard },
  { label: 'Practice', href: '#practice', icon: AudioLines },
  { label: 'Recent sessions', href: '#recent-sessions', icon: History },
]

export function DashboardSidebar() {
  return (
    <aside className="bg-sidebar px-5 py-5 text-sidebar-foreground lg:w-60 lg:shrink-0 lg:px-5 lg:py-8">
      <div className="lg:sticky lg:top-8">
        <a href="#dashboard" className="flex w-fit items-center gap-3">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-sidebar-primary">
            <span className="size-2 rounded-full bg-sidebar-primary-foreground" />
          </span>
          <span className="text-lg font-semibold tracking-tight">speakwell</span>
        </a>

        <nav aria-label="Dashboard navigation" className="mt-4 flex flex-wrap gap-1 lg:mt-9 lg:flex-col">
          {navigation.map(({ label, href, icon: Icon }) => (
            <a key={href} href={href} className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
