import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { recordingUrl, saveSessionArtifacts } from '@/lib/practice-session-api'

export function SaveSessionRecording({ token, sessionId, comments, recording, arabic }: {
  token: string
  sessionId: string
  comments: string[]
  recording?: Blob
  arabic: boolean
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save() {
    setStatus('saving')
    try {
      await saveSessionArtifacts(token, sessionId, comments, recording)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={save} disabled={status === 'saving' || status === 'saved'}>
        {recording
          ? (arabic ? 'حفظ التسجيل والملاحظات' : 'Save recording and feedback')
          : (arabic ? 'حفظ الملاحظات في سجل الجلسات' : 'Save feedback to history')}
      </Button>
      <p role="status" className="text-sm">
        {status === 'saving' && (arabic ? 'جارٍ الحفظ…' : 'Saving…')}
        {status === 'saved' && (arabic ? 'تم الحفظ في الجلسات الأخيرة.' : 'Saved in Recent Sessions.')}
        {status === 'error' && (arabic ? 'تعذّر الحفظ. جرّب مرة ثانية.' : 'Could not save. Try again.')}
      </p>
    </div>
  )
}

export function SessionRecordingPlayer({ token, sessionId, arabic }: {
  token: string
  sessionId: string
  arabic: boolean
}) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function load() {
    setStatus('loading')
    try {
      setUrl(await recordingUrl(token, sessionId))
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  return url ? (
    <video controls playsInline preload="metadata" src={url} onError={() => { setUrl(''); setStatus('error') }}
      aria-label={arabic ? 'تسجيل جلسة التدريب' : 'Practice recording'} className="w-full rounded-xl bg-black" />
  ) : (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" onClick={load} disabled={status === 'loading'}>
        {arabic ? 'فتح التسجيل' : 'Open recording'}
      </Button>
      <p className="text-sm" role="status">
        {status === 'loading' && (arabic ? 'جارٍ فتح التسجيل…' : 'Opening recording…')}
        {status === 'error' && (arabic ? 'تعذّر فتح التسجيل. جرّب مرة ثانية.' : 'Could not open the recording. Try again.')}
      </p>
    </div>
  )
}
