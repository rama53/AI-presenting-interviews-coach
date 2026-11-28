import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { recordingUrl, saveSessionReport, uploadSessionRecording } from '@/lib/practice-session-api'

type SaveStatus = 'saving' | 'saved' | 'error'

export function SaveSessionFeedback({ token, sessionId, comments, recording, arabic, onSaved }: {
  token: string
  sessionId: string
  comments: string[]
  recording?: Blob
  arabic: boolean
  onSaved: () => void
}) {
  const [feedback, setFeedback] = useState<{ key: string; status: SaveStatus } | null>(null)
  const [recordingStatus, setRecordingStatus] = useState<SaveStatus | null>(null)
  const queued = useRef(Promise.resolve())
  const scheduledComments = useRef<string | null>(null)
  const uploadedRecording = useRef(false)
  const commentsKey = JSON.stringify(comments)

  // Serialize writes because the server replaces the entire report, including its recording flag.
  function save(key: string, snapshot: string[], file?: Blob) {
    if (!file) setFeedback({ key, status: 'saving' })
    if (file) setRecordingStatus('saving')

    queued.current = queued.current.then(async () => {
      try {
        if (file && !uploadedRecording.current) {
          await uploadSessionRecording(token, sessionId, file)
          uploadedRecording.current = true
        }
        await saveSessionReport(token, sessionId, { comments: snapshot, recording: uploadedRecording.current })
        onSaved()
        setFeedback(previous => previous?.key === key ? { key, status: 'saved' } : previous)
        if (file) setRecordingStatus('saved')
      } catch {
        if (!file) setFeedback(previous => previous?.key === key ? { key, status: 'error' } : previous)
        if (file) setRecordingStatus('error')
      }
    })
  }

  useEffect(() => {
    if (!comments.length || scheduledComments.current === commentsKey) return
    scheduledComments.current = commentsKey
    save(commentsKey, comments)
  })

  const status = feedback?.key === commentsKey ? feedback.status : null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {comments.length > 0 && (
        <p role="status" className="text-muted-foreground">
          {status === 'saving' && (arabic ? 'جارٍ حفظ الملاحظات…' : 'Saving feedback…')}
          {status === 'saved' && (arabic ? 'تم حفظ الملاحظات في سجل الجلسات.' : 'Feedback saved to session history.')}
          {status === 'error' && (arabic ? 'تعذّر حفظ الملاحظات.' : 'Could not save feedback.')}
        </p>
      )}
      {status === 'error' && (
        <Button type="button" size="sm" variant="link" onClick={() => save(commentsKey, comments)}>
          {arabic ? 'إعادة محاولة الحفظ' : 'Retry saving feedback'}
        </Button>
      )}
      {recording && recordingStatus !== 'saved' && (
        <Button type="button" size="sm" variant="outline" onClick={() => save(commentsKey, comments, recording)} disabled={recordingStatus === 'saving'}>
          {recordingStatus === 'error' ? (arabic ? 'إعادة محاولة حفظ التسجيل' : 'Retry saving recording') : (arabic ? 'حفظ التسجيل' : 'Save recording')}
        </Button>
      )}
      {recordingStatus && (
        <p role="status" className="text-muted-foreground">
          {recordingStatus === 'saving' && (arabic ? 'جارٍ حفظ التسجيل…' : 'Saving recording…')}
          {recordingStatus === 'saved' && (arabic ? 'تم حفظ التسجيل.' : 'Recording saved.')}
          {recordingStatus === 'error' && (arabic ? 'تعذّر حفظ التسجيل.' : 'Could not save the recording.')}
        </p>
      )}
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
