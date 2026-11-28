import { Languages } from 'lucide-react'
import type { Language } from './copy'

export function LanguageSelect({ label, language, onChange }: {
  label: string
  language: Language
  onChange: (language: Language) => void
}) {
  return (
    <label className="flex w-fit items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-foreground shadow-sm">
      <Languages aria-hidden="true" className="size-4 text-sidebar-highlight" />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={language}
        onChange={(event) => onChange(event.currentTarget.value === 'en' ? 'en' : 'ar')}
        className="min-h-8 cursor-pointer rounded-md border-0 bg-transparent px-1 text-sm font-semibold text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
      >
        <option value="ar" lang="ar" className="text-foreground">العربية</option>
        <option value="en" lang="en" className="text-foreground">English</option>
      </select>
    </label>
  )
}
