import type { Language } from './copy'

export function LanguageSelect({ label, language, onChange }: {
  label: string
  language: Language
  onChange: (language: Language) => void
}) {
  return (
    <label className="flex w-fit items-center gap-2 text-sm font-medium">
      {label}
      <select
        value={language}
        onChange={(event) => onChange(event.currentTarget.value === 'en' ? 'en' : 'ar')}
        className="rounded-md border border-border bg-card px-2 py-1.5 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <option value="ar" lang="ar">العربية</option>
        <option value="en" lang="en">English</option>
      </select>
    </label>
  )
}
