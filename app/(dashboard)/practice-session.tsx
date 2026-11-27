'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, Maximize, Minimize, X, Square, Mic, MicOff, Video, VideoOff, Presentation, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePracticeTranscript } from './use-practice-transcript'
import { questionsFromJobDescription } from '@/lib/job-interview'
import { analyzeTranscript, buildAudienceQuestion, nextInterviewQuestion } from '@/lib/transcript-analysis'
import { AudienceQuestion } from './audience-question'
import { CameraFeedback, CameraFeedbackReport } from './camera-feedback'
import { emptyCameraSamples, type CameraSamples } from '@/lib/camera-feedback'
import { InterviewDocument } from './interview-document'
import { readPresentationSlides } from '@/lib/practice-files'
import { PracticeAnalysis } from './practice-analysis'
import type { DashboardCopy, Language } from './copy'
import type { InterviewType } from './recent-sessions'
import { AssessmentCriteria } from './assessment-criteria'

type Practice = {
  setup: string
  running: string
  defaultMinutes: number
  prompt: string
  criteria: readonly string[]
}

type InterviewDetails = {
  type: InterviewType
  jobTitle: string
  jobDescription: string
}

const interviewMaxMinutes = 20
const fieldClass = 'mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring'

type Session =
  | { phase: 'ready' }
  | { phase: 'running'; deadline: number; attachment: File | null; roomOption: number }
  | { phase: 'finished' }

export function PracticeSession({ practice, text, language, isInterview, onClose, onComplete }: {
  practice: Practice
  text: DashboardCopy
  language: Language
  isInterview: boolean
  onClose: () => void
  onComplete: (interviewType?: InterviewType) => void
}) {
  const [session, setSession] = useState<Session>({ phase: 'ready' })
  const [presentationTopic, setPresentationTopic] = useState('')
  const [previousAttempt, setPreviousAttempt] = useState<string | null>(null)
  const roomSettings = useRef<{ attachment: File | null; roomOption: number } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const startedWithSeconds = useRef(0)
  const [preparingQuestion, setPreparingQuestion] = useState(false)
  const [audienceQuestion, setAudienceQuestion] = useState<ReturnType<typeof buildAudienceQuestion> | null>(null)
  const [paused, setPaused] = useState(false)
  const [ambienceMuted, setAmbienceMuted] = useState(false)
  const ambienceRef = useRef<{ context: AudioContext; gain: GainNode } | null>(null)
  const ambienceRoom = isInterview ? 'office' : session.phase === 'running' && session.roomOption === 1 ? 'hall' : 'meeting'
  useEffect(() => {
    if (session.phase !== 'running' || !('AudioContext' in window)) return
    const context = new AudioContext()
    const gain = context.createGain()
    gain.gain.value = 0
    gain.connect(context.destination)
    const buffer = context.createBuffer(1, context.sampleRate * 8, context.sampleRate)
    const data = buffer.getChannelData(0)
    let brown = 0
    for (let i = 0; i < data.length; i++) {
      brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02
      data[i] = brown * 3.5
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = ambienceRoom === 'office' ? 230 : ambienceRoom === 'hall' ? 520 : 350
    source.connect(filter).connect(gain)
    source.start()
    ambienceRef.current = { context, gain }
    const resume = () => { void context.resume().catch(() => {}) }
    resume()
    window.addEventListener('pointerdown', resume)
    return () => {
      window.removeEventListener('pointerdown', resume)
      ambienceRef.current = null
      source.stop()
      void context.close().catch(() => {})
    }
  }, [session.phase, ambienceRoom])

  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoError, setVideoError] = useState('')
  const [videoBlocked, setVideoBlocked] = useState(false)
  const pausedAt = useRef(0)
  const roomRef = useRef<HTMLElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [camera, setCamera] = useState(false)
  const speech = usePracticeTranscript(language)
  const [slides, setSlides] = useState(false)
  const [slideUrl, setSlideUrl] = useState('')
  const [slideTexts, setSlideTexts] = useState<string[]>([])
  const [slideIndex, setSlideIndex] = useState(0)
  const [slideStatus, setSlideStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [jobDescriptionDraft, setJobDescriptionDraft] = useState('')
  const [cvText, setCvText] = useState('')
  const [readingJobFile, setReadingJobFile] = useState(false)
  const [readingCvFile, setReadingCvFile] = useState(false)
  const [mediaError, setMediaError] = useState(false)
  const cameraSamples = useRef(emptyCameraSamples())
  const previousCameraSamples = useRef<CameraSamples | null>(null)
  const preview = useRef<HTMLVideoElement>(null)
  const streams = useRef<Partial<Record<'camera', MediaStream>>>({})
  const pending = useRef(new Set<string>())
  const generation = useRef(0)
  const [interviewTurns, setInterviewTurns] = useState<{ question: string; answer: string }[]>([])
  const [interviewFollowUp, setInterviewFollowUp] = useState<string | null>(null)
  const [interviewComplete, setInterviewComplete] = useState(false)
  const [submittingInterviewAnswer, setSubmittingInterviewAnswer] = useState(false)
  const [interviewTranscriptEdit, setInterviewTranscriptEdit] = useState<string | null>(null)
  const [interview, setInterview] = useState<InterviewDetails | null>(null)
  const interviewText = text.interviewSetup
  const roomLabel = isInterview ? text.interviewPanel : text.audienceSize
  const roomOptions = isInterview ? text.interviewPanelOptions : text.audienceOptions
  const jobQuestions = useMemo(
    () => Array.from(new Set([
      ...questionsFromJobDescription(interview?.jobDescription ?? '', language, 'technical'),
      ...questionsFromJobDescription(cvText, language, 'technical'),
    ])),
    [cvText, interview, language],
  )
  const interviewQuestion = interviewFollowUp ?? (language === 'ar' ? 'عرّفنا بنفسك واحكي عن خبراتك وسبب اهتمامك بالوظيفة.' : 'Tell us about yourself, your experience, and why you are interested in this role.')
  const [speakingInterviewer, setSpeakingInterviewer] = useState(false)
  useEffect(() => {
    const audio = ambienceRef.current
    if (!audio) return
    const level = ambienceMuted || paused || speakingInterviewer || audienceQuestion ? 0 : (ambienceRoom === 'hall' ? 0.022 : 0.014) * (speech.busy ? 0.65 : 1)
    audio.gain.gain.setTargetAtTime(level, audio.context.currentTime, 0.15)
  }, [session.phase, ambienceRoom, ambienceMuted, paused, speech.busy, speakingInterviewer, audienceQuestion])

  const activeInterviewer = interviewTurns.length % 3
  const interviewerRoles = language === 'ar' ? ['الموارد البشرية', 'المحاور التقني', 'مدير التوظيف'] : ['HR Interviewer', 'Technical Interviewer', 'Hiring Manager']
  useEffect(() => {
    if (!isInterview || session.phase !== 'running' || paused || interviewComplete || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    const utterance = new SpeechSynthesisUtterance(interviewQuestion)
    utterance.lang = language === 'ar' ? 'ar' : 'en-US'
    const voices = synth.getVoices().filter(v => v.lang.toLowerCase().startsWith(utterance.lang.split('-')[0])).sort((a, b) => Number(/natural|neural|premium|enhanced|google/i.test(b.name)) - Number(/natural|neural|premium|enhanced|google/i.test(a.name)))
    const female = /female|zira|samantha|salma|hoda|aria|jenny|sonia|laila/i
    const male = /david|daniel|naayf|majed|guy|ryan|ahmed|hamdan|male/i
    const maleVoices = voices.filter(v => male.test(v.name) && !female.test(v.name))
    const voice = activeInterviewer === 0 ? voices.find(v => female.test(v.name)) ?? voices[0] : maleVoices[activeInterviewer - 1] ?? maleVoices[0] ?? voices[activeInterviewer % Math.max(voices.length, 1)]
    if (voice) utterance.voice = voice
    utterance.pitch = 1
    utterance.rate = [0.98, 1, 0.96][activeInterviewer]
    utterance.onstart = () => setSpeakingInterviewer(true)
    utterance.onend = utterance.onerror = () => setSpeakingInterviewer(false)
    synth.cancel()
    synth.speak(utterance)
    return () => { utterance.onstart = utterance.onend = utterance.onerror = null; synth.cancel(); setSpeakingInterviewer(false) }
  }, [isInterview, session.phase, paused, interviewComplete, interviewQuestion, language, activeInterviewer])

  const interviewReportTranscript = interviewTranscriptEdit ?? [...interviewTurns.map(({ answer }) => answer), speech.transcript].filter(Boolean).join('\n\n')
  const heading = useRef<HTMLHeadingElement>(null)
  const completed = useRef(false)

  const { stopMicrophone } = speech
  const finish = useCallback(() => {
    if (completed.current) return
    stopMicrophone()
    completed.current = true
    setSession({ phase: 'finished' })
    onComplete()
  }, [onComplete, stopMicrophone])

  useEffect(() => {
    heading.current?.focus()
  }, [session.phase])

  useEffect(() => {
    if (session.phase !== 'running' || paused) return

    function updateTime(deadline: number) {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) finish()
    }

    const timer = window.setInterval(updateTime, 250, session.deadline)
    return () => window.clearInterval(timer)
  }, [session, finish, paused])

  useEffect(() => {
    if (session.phase !== 'running') return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const sync = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('fullscreenchange', sync)
      if (document.fullscreenElement === roomRef.current) void document.exitFullscreen().catch(() => {})
    }
  }, [session.phase, isInterview])

  useEffect(() => {
    if (session.phase !== 'running') return
    return () => {
      generation.current++
      Object.values(streams.current).forEach(stream => stream?.getTracks().forEach(track => track.stop()))
      streams.current = {}
    }
  }, [session.phase, isInterview])

  useEffect(() => {
    if (camera && preview.current) preview.current.srcObject = streams.current.camera ?? null
  }, [camera])

  const attachment = session.phase === 'running' ? session.attachment : null
  useEffect(() => {
    if (!attachment || !/\.pdf$/i.test(attachment.name)) { setSlideUrl(''); return }
    const url = URL.createObjectURL(attachment)
    setSlideUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [attachment])

  useEffect(() => {
    setSlideTexts([])
    setSlideIndex(0)
    setSlideStatus('idle')
    if (!slides || !attachment || !/\.pptx$/i.test(attachment.name)) return

    let cancelled = false
    setSlideStatus('loading')
    void readPresentationSlides(attachment).then((items) => {
      if (cancelled) return
      setSlideTexts(items)
      setSlideStatus('idle')
    }).catch(() => {
      if (!cancelled) setSlideStatus('error')
    })
    return () => { cancelled = true }
  }, [attachment, slides])

  async function toggleCamera() {
    const kind = 'camera'
    if (pending.current.has(kind)) return
    if (streams.current[kind]) {
      streams.current[kind]?.getTracks().forEach(track => track.stop())
      delete streams.current[kind]
      setCamera(false)
      return
    }
    pending.current.add(kind)
    const token = generation.current
    try {
      setMediaError(false)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (token !== generation.current) { stream.getTracks().forEach(track => track.stop()); return }
      streams.current[kind] = stream
      setCamera(true)
    } catch { if (token === generation.current) setMediaError(true) }
    finally { pending.current.delete(kind) }
  }

  useEffect(() => {
    if (!preparingQuestion || !paused || session.phase !== 'running' || speech.busy) return
    setAudienceQuestion(buildAudienceQuestion(speech.transcript, language, presentationTopic))
    setPreparingQuestion(false)
  }, [preparingQuestion, paused, session.phase, speech.busy, speech.transcript, language, presentationTopic])

  useEffect(() => {
    if (!submittingInterviewAnswer || session.phase !== 'running' || speech.busy) return
    setSubmittingInterviewAnswer(false)
    const answer = speech.transcript.trim()
    if (!answer) return

    const turns = [...interviewTurns, { question: interviewQuestion, answer }]
    const asked = turns.map(({ question }) => question)
    const nextRole = turns.length % 3
    const managerQuestions = language === 'ar' ? ['احكي عن موقف واجهت فيه ضغطًا أو خلافًا ضمن فريق، وكيف تعاملت معه؟', 'كيف ترتب أولوياتك عندما تتعارض المواعيد والمسؤوليات؟'] : ['Tell us about a time you faced pressure or conflict within a team. How did you handle it?', 'How do you prioritize when deadlines and responsibilities conflict?']
    const next = turns.length >= 9 ? null : nextRole === 1
      ? nextInterviewQuestion(answer, language, 'technical', asked, jobQuestions)
      : nextRole === 2
        ? managerQuestions.find(q => !asked.includes(q)) ?? nextInterviewQuestion(answer, language, 'personal', asked)
        : nextInterviewQuestion(answer, language, 'personal', asked)

    setInterviewTurns(turns)
    setInterviewFollowUp(next)
    setInterviewComplete(next === null)
    speech.setTranscript('')
  }, [submittingInterviewAnswer, session.phase, speech.busy, speech.transcript, speech.setTranscript, interviewTurns, interviewQuestion, language, interview?.type, jobQuestions])

  function togglePause() {
    if (session.phase !== 'running') return
    if (paused) {
      setSession({ ...session, deadline: session.deadline + Date.now() - pausedAt.current })
      setPaused(false)
      void videoRef.current?.play().catch(() => {})
    } else {
      pausedAt.current = Date.now()
      setPaused(true)
      stopMicrophone()
      videoRef.current?.pause()
    }
  }

  function startPractice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (readingJobFile || readingCvFile) return
    const fields = new FormData(event.currentTarget)
    const duration = Number(fields.get('minutes')) * 60
    if (isInterview) {
      setInterview({
        type: 'personal',
        jobTitle: String(fields.get('job-title') ?? '').trim(),
        jobDescription: String(fields.get('job-description') ?? '').trim(),
      })
    }
    startedWithSeconds.current = duration
    setSecondsLeft(duration)
    if (!isInterview) setPresentationTopic(String(fields.get('presentation-topic') ?? '').trim())
    const file = fields.get('attachment')
    const settings = {
      attachment: file instanceof File && file.name ? file : null,
      roomOption: isInterview ? 2 : Number(fields.get('room-option')),
    }
    roomSettings.current = settings
    setSession({ phase: 'running', deadline: Date.now() + duration * 1000, ...settings })
  }

  function retryPresentation() {
    const settings = roomSettings.current
    if (!settings || speech.busy) return

    previousCameraSamples.current = cameraSamples.current
    cameraSamples.current = emptyCameraSamples()
    setPreparingQuestion(false)
    setPreviousAttempt(speech.transcript)
    speech.setTranscript('')
    completed.current = false
    setAudienceQuestion(null)
    setPaused(false)
    setSlides(false)
    setCamera(false)
    setMediaError(false)
    setVideoError('')
    setVideoBlocked(false)
    setSecondsLeft(startedWithSeconds.current)
    setSession({ phase: 'running', deadline: Date.now() + startedWithSeconds.current * 1000, ...settings })
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, '0')

  if (session.phase === 'running') {
    const ar = language === 'ar'
    return createPortal(
      <section ref={roomRef} className="fixed inset-0 z-[100] isolate overflow-hidden bg-[#101d2c] text-white" aria-labelledby="practice-session-heading">
        {isInterview ? (
          <div className="absolute inset-0">
            <div className="relative h-full w-full">
              <img src={`${process.env.NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH ?? ''}/Three-Person%20Office%20Interview%20Panel.png`} alt={ar ? 'ثلاثة محاورين' : 'Three interviewers'} className="h-full w-full object-cover object-center" />
              <div dir="ltr" className="absolute inset-x-[5%] top-[66%] grid grid-cols-3 gap-1 text-center">
                {interviewerRoles.map((role, index) => <span key={role} className={`mx-auto rounded-lg px-2 py-1 text-xs font-semibold ${index === activeInterviewer && !interviewComplete ? 'bg-amber-300 text-slate-900' : 'bg-black/75 text-white'}`}>{role}{index === activeInterviewer && speakingInterviewer ? (ar ? ' · يتحدث' : ' · Speaking') : ''}</span>)}
              </div>
            </div>
          </div>
        ) : session.roomOption === 1 ? (
          <img src={`${process.env.NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH ?? ''}/audience-large.png`} alt={ar ? 'جمهور كبير' : 'Large audience'} className="absolute inset-0 h-full w-full object-cover object-center" />
        ) : (
          <>
        <video ref={videoRef} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover object-center"
          preload="auto"
          onCanPlay={e => { if (!paused) { e.currentTarget.muted = true; void e.currentTarget.play().catch(() => setVideoBlocked(true)) } }}
          onPlaying={() => { setVideoBlocked(false); setVideoError('') }}
          onError={e => setVideoError(String(e.currentTarget.error?.code ?? 'unknown'))}
          src={`${process.env.NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH ?? ''}/audience-v2.mp4.mp4`} />
        {(videoError || videoBlocked) && <div className="absolute inset-0 grid place-items-center"><div className="rounded-xl bg-black/80 p-5 text-center"><p>{videoError ? (ar ? 'تعذر تشغيل الفيديو — رمز الخطأ: ' : 'Video failed — error code: ') + videoError : (ar ? 'اضغط لتشغيل الجمهور' : 'Click to play audience')}</p><button type="button" className="mt-3 rounded-lg bg-white/20 px-4 py-2" onClick={() => { setVideoError(''); const v = videoRef.current; if (v) { if (v.error) v.load(); v.muted = true; void v.play().catch(() => setVideoBlocked(true)) } }}>{ar ? 'تشغيل الفيديو' : 'Play video'}</button></div></div>}
          </>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/75 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 to-transparent" />
        <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 sm:p-7">
          <h1 ref={heading} tabIndex={-1} id="practice-session-heading" className="sr-only">{practice.running}</h1>
          <div className="ms-auto flex items-center gap-2">
            <div className="rounded-2xl border border-white/20 bg-[#142332]/85 px-3 py-1.5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs text-white/80"><span className={`h-2 w-2 rounded-full ${paused ? 'bg-amber-400' : 'bg-emerald-400'}`} />{paused ? (ar ? 'متوقف مؤقتاً' : 'Paused') : (ar ? 'جلسة مباشرة' : 'Live session')}</div>
              <div role="timer" aria-label={text.remaining} className="text-center text-xl font-semibold tabular-nums"><bdi dir="ltr">{minutes}:{seconds}</bdi></div>
            </div>
            <button type="button" onClick={onClose} aria-label={text.cancel} title={text.cancel} className="rounded-full bg-black/45 p-3 hover:bg-black/70"><X size={20}/></button>
          </div>
        </header>
        {paused && <div className="pointer-events-none absolute inset-0 grid place-items-center"><span className="rounded-full bg-black/65 px-6 py-3 text-lg backdrop-blur">{ar ? 'الجلسة متوقفة مؤقتاً' : 'Session paused'}</span></div>}
        {camera && <video ref={preview} autoPlay muted playsInline className="absolute end-4 bottom-32 w-36 rounded-xl border border-white/30 bg-black shadow-xl sm:w-48" style={{ transform: 'scaleX(-1)' }} />}
        {slides && <aside className="absolute start-4 top-24 bottom-32 flex w-[min(85vw,420px)] flex-col overflow-hidden rounded-xl border border-white/20 bg-[#142332]/95 shadow-xl">
          <div className="flex items-center justify-between p-3"><span>{ar ? 'الشرائح' : 'Slides'}</span><button type="button" onClick={() => setSlides(false)} aria-label={ar ? 'إغلاق' : 'Close'}><X size={18}/></button></div>
          {slideUrl ? (
            <iframe title={ar ? 'الشرائح' : 'Slides'} src={slideUrl} className="min-h-0 flex-1 bg-white" />
          ) : slideTexts.length ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
              <p className="text-xs text-white/75">{ar ? 'معاينة نصّية' : 'Text preview'} · {slideIndex + 1}/{slideTexts.length}</p>
              <p dir="auto" className="whitespace-pre-wrap">{slideTexts[slideIndex] || (ar ? 'ما في نص قابل للعرض بهالشريحة.' : 'This slide has no displayable text.')}</p>
              <div className="flex gap-2">
                <button type="button" disabled={slideIndex === 0} className="rounded bg-white/20 px-3 py-1 disabled:opacity-40" onClick={() => setSlideIndex((index) => index - 1)}>{ar ? 'السابقة' : 'Previous'}</button>
                <button type="button" disabled={slideIndex === slideTexts.length - 1} className="rounded bg-white/20 px-3 py-1 disabled:opacity-40" onClick={() => setSlideIndex((index) => index + 1)}>{ar ? 'التالي' : 'Next'}</button>
              </div>
            </div>
          ) : (
            <p className="p-4 text-sm">
              {slideStatus === 'loading' ? (ar ? 'جاري قراءة الشرائح…' : 'Reading slides…') :
                attachment ? (ar ? 'المعاينة الكاملة متاحة بصيغة PDF. يمكن تصدير الشرائح كـPDF.' : 'Export the slides as PDF for a full preview.') :
                (ar ? 'لم يتم إرفاق شرائح' : 'No slides attached')}
            </p>
          )}
        </aside>}
        {camera && <CameraFeedback preview={preview} samples={cameraSamples.current} language={language} paused={paused} />}
        {mediaError && <p role="alert" className="absolute bottom-32 start-4 rounded-lg bg-black/85 p-3 text-sm">{ar ? 'تحقق من أذونات الكاميرا والمايك' : 'Check camera and microphone permissions'}</p>}
        <p role="status" className="absolute end-4 top-24 max-w-xs rounded-lg bg-black/80 p-2 text-xs">
          {speech.status === 'unavailable' || speech.status === 'error'
            ? (ar ? 'التفريغ الصوتي غير متاح. تحقق من المايك أو استخدم Chrome.' : 'Voice transcription unavailable. Check your microphone or try Chrome.')
            : (ar ? 'قد يرسل المتصفح الصوت إلى خدمة تحويل الكلام إلى نص عند تشغيل المايك.' : 'Your browser may send audio to a transcription service when the mic is on.')}
        </p>
        {isInterview && (
          <section className="absolute inset-x-4 bottom-28 mx-auto max-w-3xl rounded-xl bg-black/65 px-3 py-2 text-center backdrop-blur-sm sm:bottom-28">
            {interviewComplete ? (
              <p role="status" className="text-sm">{ar ? 'انتهت الأسئلة. يمكن إنهاء التدريب لعرض التقرير.' : 'Questions complete. End the session to see your report.'}</p>
            ) : (
              <>
                <p aria-live="polite" className="mx-auto max-h-16 overflow-auto text-sm font-medium leading-relaxed text-white">{interviewQuestion}</p>
                <p role="status" className="mt-1 text-xs text-white/70">{speakingInterviewer ? (ar ? 'المحاور يتحدث' : 'Interviewer speaking') : speech.busy ? (ar ? 'جاري الاستماع…' : 'Listening…') : (ar ? 'اضغط على المايك للإجابة' : 'Tap the mic to answer')}</p>
              </>
            )}
          </section>
        )}
        <footer className="absolute inset-x-0 bottom-0 flex justify-center p-4 sm:p-7">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-3xl border border-white/15 bg-[#142332]/90 p-2 shadow-2xl backdrop-blur-xl sm:gap-3 sm:p-3">
            {[
              { label: ar ? 'المايك' : 'Mic', active: speech.busy, Icon: speech.busy ? Mic : MicOff, action: () => { if (speech.status === 'listening') stopMicrophone(); else if (!paused && !speech.busy && !submittingInterviewAnswer && !interviewComplete && !speakingInterviewer) speech.startMicrophone() } },
              { label: ar ? 'صوت الخلفية' : 'Ambience', active: !ambienceMuted, Icon: ambienceMuted ? VolumeX : Volume2, action: () => setAmbienceMuted(v => !v) },
              { label: ar ? 'الكاميرا' : 'Camera', active: camera, Icon: camera ? Video : VideoOff, action: () => void toggleCamera() },
              ...(!isInterview ? [{ label: ar ? 'الشرائح' : 'Slides', active: slides, Icon: Presentation, action: () => setSlides(v => !v) }] : []),
              { label: paused ? (ar ? 'استئناف' : 'Resume') : (ar ? 'إيقاف مؤقت' : 'Pause'), active: paused, Icon: paused ? Play : Pause, action: () => { setPreparingQuestion(false); togglePause() } },
            ].map(({ label, active, Icon, action }) => <button key={label} type="button" onClick={action} aria-pressed={active} title={label} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs ${active ? 'bg-white/20' : 'hover:bg-white/10'}`}><Icon size={21}/><span>{label}</span></button>)}
            <button type="button" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void roomRef.current?.requestFullscreen?.().catch(() => {}) }} className="rounded-2xl p-3 hover:bg-white/10" aria-label={ar ? 'ملء الشاشة' : 'Toggle fullscreen'} title={ar ? 'ملء الشاشة' : 'Toggle fullscreen'}>{fullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}</button>
            {!isInterview && <button type="button" disabled={paused} onClick={() => {
              setPreparingQuestion(true)
              togglePause()
            }} className="rounded-xl border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50">
              {preparingQuestion
                ? (ar ? 'جاري تحضير السؤال…' : 'Preparing the question…')
                : (ar ? 'انتهيت من العرض — بدء الأسئلة' : 'I’m done and ready for questions')}
            </button>}
            {isInterview && !interviewComplete && <button type="button" disabled={paused || speakingInterviewer || submittingInterviewAnswer || (!speech.busy && !speech.transcript.trim())} onClick={() => { setSubmittingInterviewAnswer(true); stopMicrophone() }} className="rounded-xl border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50">{submittingInterviewAnswer ? (ar ? 'جاري التحضير…' : 'Preparing…') : (ar ? 'السؤال التالي' : 'Next question')}</button>}
            <span className="h-8 w-px bg-white/20"/>
            <button type="button" onClick={finish} className="flex items-center gap-2 rounded-2xl bg-[#c65b40] px-3 py-3 text-xs font-semibold hover:bg-[#ad4931]"><Square size={16} fill="currentColor"/> {text.finish}</button>
          </div>
        </footer>
        {audienceQuestion && (
          <AudienceQuestion question={audienceQuestion} language={language} onClose={() => {
            setAudienceQuestion(null)
            togglePause()
          }} onFinish={() => {
            setAudienceQuestion(null)
            finish()
          }} />
        )}
      </section>, document.body
    )
  }

  return (
    <section id="practice-session" aria-labelledby="practice-session-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <h1 ref={heading} tabIndex={-1} id="practice-session-heading" className="text-2xl font-semibold tracking-tight">
        {session.phase === 'finished' ? text.complete : session.phase === 'ready' ? practice.setup : practice.running}
      </h1>
      {session.phase === 'finished' && (() => {
        const ar = language === 'ar'
        const transcript = isInterview ? interviewReportTranscript : speech.transcript
        const words = transcript.trim().split(/\s+/).filter(Boolean).length
        const elapsed = Math.max(0, startedWithSeconds.current - secondsLeft)
        const turns = [...interviewTurns, ...(isInterview && speech.transcript.trim() ? [{ question: interviewQuestion, answer: speech.transcript }] : [])]
        const reviews = turns.map((turn, index) => ({ ...turn, result: analyzeTranscript({ transcript: turn.answer, language, mode: index % 3 === 1 ? 'technical' : 'personal' }) }))
        const overall = analyzeTranscript({ transcript, language, mode: isInterview ? 'personal' : 'presentation', presentationTopic })
        const notes = [...new Set(isInterview ? reviews.flatMap(r => r.result ? [r.result.note] : []) : overall ? [overall.note] : [])].slice(0, 3)
        const roles = ar ? ['الموارد البشرية', 'المحاور التقني', 'مدير التوظيف'] : ['HR Interviewer', 'Technical Interviewer', 'Hiring Manager']
        const colors = ['bg-[#F8E4CE] text-[#985321]', 'bg-[#E8E3F4] text-[#66518E]', 'bg-[#DDECE3] text-[#35664F]']
        const stats = [{ label: ar ? 'مدة التدريب التقريبية' : 'Approximate duration', value: Math.floor(elapsed / 60) + ':' + String(elapsed % 60).padStart(2, '0') }, { label: isInterview ? (ar ? 'الإجابات' : 'Answers') : (ar ? 'عينات الكاميرا' : 'Camera samples'), value: isInterview ? turns.length : cameraSamples.current.total }, { label: ar ? 'عدد الكلمات' : 'Words', value: words }]
        return <div className="mt-5 space-y-5 rounded-2xl bg-[#F7F4EE] p-3 text-[#182D43] sm:p-6">
          <div className="rounded-2xl bg-[#182D43] p-6 text-white">
            <p className="text-sm font-medium text-[#F4B77C]">{ar ? 'طليق · تقرير الأداء' : 'Taleek · Performance report'}</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{ar ? 'كل محاولة تصنع فرقًا.' : 'Every attempt makes a difference.'}</h2>
            <p className="mt-2 text-sm text-slate-200">{isInterview ? interview?.jobTitle : presentationTopic || practice.running}</p>
            <p className="mt-4 border-t border-white/20 pt-3 text-sm text-slate-200">{ar ? 'ملاحظات مبنية على النص وعينات الكاميرا المتاحة، وليست تقييمًا مهنيًا نهائيًا.' : 'Feedback is based on available transcript and camera samples, not a definitive professional assessment.'}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">{stats.map((stat, i) => <div key={stat.label} className={`rounded-xl p-3 sm:p-5 ${colors[i]}`}><p className="text-2xl font-bold tabular-nums" dir="ltr">{stat.value}</p><p className="mt-2 text-xs font-medium">{stat.label}</p></div>)}</div>
          <h2 className="text-xl font-bold">{ar ? 'نظرة على أدائك' : 'Performance overview'}</h2>
          <div className="rounded-xl bg-white p-4">
            <AssessmentCriteria title={text.assessment} criteria={isInterview ? [...new Set([...practice.criteria, ...interviewText.technicalCriteria])] : practice.criteria} />
            {overall && <p className="mt-3 rounded-lg bg-[#FCF0E3] p-3 text-sm">{overall.note}</p>}
            {!overall && <p className="mt-3 text-sm">{ar ? 'لا يوجد نص كافٍ للتحليل.' : 'Not enough transcript for analysis.'}</p>}
            <CameraFeedbackReport samples={cameraSamples.current} previous={previousCameraSamples.current} language={language} />
          </div>
          {isInterview && <><h2 className="text-xl font-bold">{ar ? 'مراجعة الأسئلة والإجابات' : 'Question and answer review'}</h2>
          {reviews.map((r, i) => <details key={i} open={i === 0} className="rounded-xl bg-white p-4"><summary className="cursor-pointer font-semibold"><span className={`me-2 inline-block rounded-lg px-2 py-1 text-xs ${colors[i % 3]}`}>{i + 1} · {roles[i % 3]}</span>{r.question}</summary><div className="mt-4 space-y-3 border-t border-slate-200 pt-3 text-sm"><p className="font-medium">{ar ? 'إجابتك' : 'Your answer'}</p><p dir="auto" className="whitespace-pre-wrap">{r.answer}</p>{r.result && <>{r.result.evidence && <div className="rounded-lg bg-[#EDF5EF] p-3"><h3 className="font-semibold text-[#35664F]">{ar ? 'من كلامك' : 'Evidence from your answer'}</h3><p>{r.result.evidence}</p></div>}<div className="rounded-lg bg-[#FCF0E3] p-3"><h3 className="font-semibold text-[#985321]">{ar ? 'فرصة للتحسين' : 'Opportunity to improve'}</h3><p>{r.result.note}</p></div><div className="rounded-lg bg-[#F1EEF8] p-3"><h3 className="font-semibold text-[#66518E]">{ar ? 'قالب للتدريب' : 'Practice template'}</h3><p>{r.result.retry}</p></div></>}</div></details>)}</>}
          <div className="rounded-xl bg-[#E5ECE5] p-5"><h2 className="text-lg font-bold">{ar ? 'خطة التدريب القادمة' : 'Next practice plan'}</h2>{notes.length ? <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm">{notes.map(note => <li key={note}>{note}</li>)}</ol> : <p className="mt-2 text-sm">{ar ? 'سجّل إجابة أو عرضًا للحصول على ملاحظات مخصصة.' : 'Record an answer or presentation for tailored feedback.'}</p>}</div>
          <details className="rounded-xl bg-white p-4"><summary className="cursor-pointer font-semibold">{ar ? 'النص الكامل والمراجعة' : 'Full transcript and revision'}</summary><PracticeAnalysis presentationTopic={presentationTopic} previousAttempt={previousAttempt} speech={isInterview ? { ...speech, transcript: interviewReportTranscript, setTranscript: value => setInterviewTranscriptEdit(typeof value === 'function' ? value(interviewReportTranscript) : value) } : speech} language={language} mode={isInterview ? 'personal' : 'presentation'} running={false} /></details>
          <Button type="button" variant="outline" onClick={() => {
            const report = [ar ? 'طليق - تقرير الأداء' : 'Taleek - Performance report', ...stats.map(x => x.label + ': ' + x.value), ...reviews.map(r => [r.question, r.answer, r.result?.note, r.result?.retry].filter(Boolean).join('\n')), transcript, ...notes].join('\n\n')
            const url = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }))
            const link = document.createElement('a'); link.href = url; link.download = 'taleek-report.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
          }}>{ar ? 'حفظ التقرير' : 'Download report'}</Button>
        </div>
      })()}
      {session.phase === 'ready' && isInterview && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{interviewText.intro}</p>}
      {session.phase === 'ready' ? (
        <form className="mt-4" onSubmit={startPractice}>
          {!isInterview && (
            <label className="mb-4 block text-sm font-medium">
              {language === 'ar' ? 'موضوع العرض (اختياري)' : 'Presentation topic (optional)'}
              <input name="presentation-topic" className={fieldClass} dir="auto" maxLength={160} />
            </label>
          )}
          {isInterview && (
            <div className="mb-5 grid gap-5">
              <div>
                <label htmlFor="job-title" className="block text-sm font-medium">{interviewText.jobTitle}</label>
                <input
                  id="job-title"
                  name="job-title"
                  dir="auto"
                  required
                  maxLength={120}
                  pattern={String.raw`.*\S.*`}
                  placeholder={interviewText.jobTitlePlaceholder}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="job-description" className="block text-sm font-medium">{interviewText.jobDescription}</label>
                <textarea
                  id="job-description"
                  name="job-description"
                  value={jobDescriptionDraft}
                  readOnly={readingJobFile}
                  onChange={(event) => setJobDescriptionDraft(event.target.value)}
                  dir="auto"
                  rows={4}
                  maxLength={4000}
                  placeholder={language === 'ar' ? 'أضف متطلبات الإعلان لتخصيص الأسئلة' : 'Paste the job requirements to tailor interview questions'}
                  className={fieldClass}
                />
              </div>
            </div>
          )}
          {!isInterview && (
          <div className="mb-4">
            <label htmlFor="room-option" className="block text-sm font-medium">{roomLabel}</label>
            <select id="room-option" name="room-option" defaultValue={0} className={fieldClass}>
              {roomOptions.map((label, index) => <option key={index} value={index}>{label}</option>)}
            </select>
          </div>
          )}
          <div className="mb-4">
            <label htmlFor="session-minutes" className="block text-sm font-medium">{text.duration}</label>
            <input
              id="session-minutes"
              name="minutes"
              type="number"
              min={1}
              max={isInterview ? interviewMaxMinutes : 120}
              aria-describedby={isInterview ? 'interview-duration-hint' : undefined}
              defaultValue={practice.defaultMinutes}
              required
              className="mt-1.5 w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            />
            {isInterview && <p id="interview-duration-hint" className="mt-1 text-xs text-muted-foreground">{interviewText.durationHint}</p>}
          </div>
          {isInterview ? (
            <div className="mb-5 space-y-3">
              <InterviewDocument kind="job" language={language} onText={setJobDescriptionDraft} onLoading={setReadingJobFile} />
              <InterviewDocument kind="cv" language={language} onText={setCvText} onLoading={setReadingCvFile} />
            </div>
          ) : (
          <div className="mb-5">
            <label htmlFor="session-attachment" className="block text-sm font-medium">
              {text.presentationFile}
            </label>
            <input
              id="session-attachment"
              name="attachment"
              type="file"
              accept=".pdf,.pptx"
              className={`${fieldClass} file:me-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-2 file:py-1 file:font-medium file:text-primary`}
            />
          </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={readingJobFile || readingCvFile}>{text.start}</Button>
            <Button type="button" variant="outline" onClick={onClose}>{text.cancel}</Button>
          </div>
        </form>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          {session.phase === 'finished' && !isInterview && (
            <Button type="button" disabled={speech.busy} onClick={retryPresentation}>
              {language === 'ar' ? 'محاولة مرة أخرى' : 'Try the presentation again'}
            </Button>
          )}
          <Button type="button" variant={session.phase === 'finished' && isInterview ? 'default' : 'outline'} onClick={onClose}>
            {session.phase === 'finished' ? text.back : text.cancel}
          </Button>
        </div>
      )}
    </section>
  )
}
