'use client'

import { useRef, useState } from 'react'
import { readPracticeDocument } from '@/lib/practice-files'
import type { Language } from './copy'

export function InterviewDocument({ kind, language, onText, onLoading }: {
  kind: 'job' | 'cv'
  language: Language
  onText: (text: string) => void
  onLoading: (loading: boolean) => void
}) {
  const ar = language === 'ar'
  const request = useRef(0)
  const [message, setMessage] = useState('')
  const label = kind === 'job'
    ? (ar ? 'ملف إعلان الوظيفة (اختياري)' : 'Job advertisement file (optional)')
    : (ar ? 'السيرة الذاتية (اختياري)' : 'CV (optional)')

  async function loadFile(file?: File) {
    const id = ++request.current
    onLoading(Boolean(file))
    setMessage(file ? (ar ? 'جاري قراءة الملف…' : 'Reading file…') : '')
    if (kind === 'cv') onText('')
    if (!file) return
    try {
      const text = await readPracticeDocument(file, 4000)
      if (id !== request.current) return
      if (!text) {
        setMessage(ar ? 'ما قدرنا نقرأ نص من الملف. إذا كان صورة، يمكن استخدام نسخة فيها نص قابل للتحديد.' : 'No text could be read. For scanned documents, choose a copy with selectable text.')
        return
      }
      onText(text)
      setMessage(kind === 'job'
        ? (ar ? 'انقرأ الملف. يمكنك مراجعة النص المضاف إلى وصف الوظيفة.' : 'File read. Review the extracted text in the job description.')
        : (ar ? 'انقرأ الـCV. ممكن تدخل المهارات اللي اتعرّف عليها التطبيق ضمن أسئلة المقابلة.' : 'CV read. Recognized skills can inform interview questions.'))
    } catch {
      if (id !== request.current) return
      setMessage(ar ? 'تعذّرت قراءة الملف. يمكن استخدام PDF أو DOCX بحجم أقل من ١٢ ميغابايت.' : 'Could not read the file. Try a PDF or DOCX under 12 MB.')
    } finally {
      if (id === request.current) onLoading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium">
        {label}
        <input type="file" accept=".pdf,.docx" className="mt-1.5 block w-full rounded-md border border-input bg-background p-2 text-sm" onChange={(event) => void loadFile(event.target.files?.[0])} />
      </label>
      {message && <p role="status" className="mt-1 text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
