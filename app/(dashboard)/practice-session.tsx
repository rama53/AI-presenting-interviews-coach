'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { savePracticeEnd, savePracticeStart } from '@/lib/practice-session-api'
import { SaveSessionRecording } from './session-recording'
import { usePracticeRecording } from './use-practice-recording'
import { createPortal } from 'react-dom'
import { Pause, Play, Maximize, Minimize, X, Square, Mic, MicOff, Video, VideoOff, Presentation, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePracticeTranscript } from './use-practice-transcript'
import { questionsFromJobDescription } from '@/lib/job-interview'
import { analyzeTranscript, buildAudienceQuestion, nextInterviewQuestion } from '@/lib/transcript-analysis'
import { PresentationAIReview, presentationAIAvailable, requestPresentationAI, type AudienceAnswer, type PresentationReview } from './presentation-ai-review'
import { PresentationFeedback, PresentationVoiceMonitor } from './presentation-feedback'
import { questionFromSlides, type VoiceSamples } from '@/lib/presentation-feedback'
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
const fieldClass = 'mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-[#182D43] placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-[#315B82]'

type Session =
  | { phase: 'ready' }
  | { phase: 'running'; deadline: number; attachment: File | null; roomOption: number }
  | { phase: 'finished' }

const answerVerdicts = {
  correct: { ar: 'إجابة صحيحة', en: 'Correct' },
  incorrect: { ar: 'إجابة غير صحيحة', en: 'Incorrect' },
  complete: { ar: 'إجابة مكتملة', en: 'Complete' },
  partial: { ar: 'إجابة ناقصة', en: 'Incomplete' },
  off_topic: { ar: 'الإجابة خارج السؤال', en: 'Off-topic' },
  uncertain: { ar: 'لا يمكن الحكم على الإجابة', en: 'Cannot assess' },
}

export function PracticeSession({ practice, text, language, isInterview, accessToken, onClose, onComplete }: {
  practice: Practice
  text: DashboardCopy
  language: Language
  isInterview: boolean
  accessToken: string | null
  onClose: () => void
  onComplete: (interviewType?: InterviewType) => void
}) {
  const [session, setSession] = useState<Session>({ phase: 'ready' })
  const savingStart = useRef(false)
  const [isSavingStart, setIsSavingStart] = useState(false)
  const [startError, setStartError] = useState('')
  const [presentationTopic, setPresentationTopic] = useState('')
  const [previousAttempt, setPreviousAttempt] = useState<string | null>(null)
  const roomSettings = useRef<{ attachment: File | null; roomOption: number } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const startedWithSeconds = useRef(0)
  const [usePresentationAI, setUsePresentationAI] = useState(false)
  const [preparingQuestion, setPreparingQuestion] = useState(false)
  const [audienceQuestion, setAudienceQuestion] = useState<{ text: string; audio: string | null } | null>(null)
  const [audienceAnswer, setAudienceAnswer] = useState<AudienceAnswer | null>(null)
  const [presentationReview, setPresentationReview] = useState<{ transcript: string; result: PresentationReview } | null>(null)
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
  const voiceSamples = useRef<VoiceSamples>({ voiced: 0, pitch: [] })
  const cameraSamples = useRef(emptyCameraSamples())
  const previousCameraSamples = useRef<CameraSamples | null>(null)
  const preview = useRef<HTMLVideoElement>(null)
  const streams = useRef<Partial<Record<'camera', MediaStream>>>({})
  const pending = useRef(new Set<string>())
  const generation = useRef(0)
  const [aiFeedback, setAiFeedback] = useState<{ score: number; summary: string; strengths: string[]; improvements: string[]; action_plan: string[]; interviewer_scores: (number | null)[]; answers: { index: number; verdict?: keyof typeof answerVerdicts; feedback: string; improvement: string }[] } | null>(null)
  const [aiFeedbackStatus, setAiFeedbackStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [interviewTurns, setInterviewTurns] = useState<{ question: string; answer: string }[]>([])
  const [interviewFollowUp, setInterviewFollowUp] = useState<string | null>(null)
  const [generatingInterviewQuestion, setGeneratingInterviewQuestion] = useState(false)
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
    if (!isInterview || session.phase !== 'running' || paused || interviewComplete || generatingInterviewQuestion) return
    let cancelled = false
    let audio: HTMLAudioElement | undefined
    let objectUrl: string | undefined
    const controller = new AbortController()
    const fallback = () => {
      if (cancelled) return
      if (!('speechSynthesis' in window)) { setSpeakingInterviewer(false); return }
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
    utterance.onstart = () => { if (!cancelled) setSpeakingInterviewer(true) }
    utterance.onend = utterance.onerror = () => { if (!cancelled) setSpeakingInterviewer(false) }
    synth.cancel()
    synth.speak(utterance)

    }
    const api = process.env.NEXT_PUBLIC_TALEEQ_API_URL
    if (!api) fallback()
    else {
      setSpeakingInterviewer(true)
      void (async () => {
        try {
          const response = await fetch(api.replace(/\/$/, '') + '/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}) },
            body: JSON.stringify({ text: interviewQuestion, interviewer: activeInterviewer, language }),
            signal: controller.signal,
          })
          if (!response.ok) throw new Error('tts')
          const blob = await response.blob()
          if (cancelled) return
          objectUrl = URL.createObjectURL(blob)
          audio = new Audio(objectUrl)
          audio.onended = () => { if (!cancelled) setSpeakingInterviewer(false) }
          audio.onerror = () => { if (!cancelled) { audio?.pause(); fallback() } }
          await audio.play()
        } catch {
          if (!cancelled) fallback()
        }
      })()
    }
    return () => {
      cancelled = true
      controller.abort()
      if (audio) { audio.onended = audio.onerror = null; audio.pause() }
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      setSpeakingInterviewer(false)
    }
  }, [isInterview, session.phase, paused, interviewComplete, interviewQuestion, language, activeInterviewer, accessToken, generatingInterviewQuestion])

  useEffect(() => {
    if (!isInterview || session.phase !== 'finished' || speech.busy) return
    const history = [...interviewTurns, ...(speech.transcript.trim() ? [{ question: interviewQuestion, answer: speech.transcript }] : [])]
    const api = process.env.NEXT_PUBLIC_TALEEQ_API_URL
    if (!history.length || !api) return
    const controller = new AbortController()
    setAiFeedback(null)
    setAiFeedbackStatus('loading')
    void (async () => {
      try {
        const response = await fetch(api.replace(/\/$/, '') + '/ai/interview/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}) },
          body: JSON.stringify({ role: (interview?.jobTitle || 'General interview').slice(0, 200), job_description: (interview?.jobDescription ?? '').slice(0, 12000), language, history: history.map(t => ({ question: t.question.slice(0, 600), answer: t.answer.slice(0, 6000) })) }),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Feedback unavailable')
        const report = await response.json()
        if (!controller.signal.aborted) { setAiFeedback(report); setAiFeedbackStatus('idle') }
      } catch { if (!controller.signal.aborted) setAiFeedbackStatus('error') }
    })()
    return () => controller.abort()
  }, [isInterview, session.phase, speech.busy, speech.transcript, interviewTurns, interviewQuestion, interview, language, accessToken])
  const interviewReportTranscript = interviewTranscriptEdit ?? [...interviewTurns.map(({ answer }) => answer), speech.transcript].filter(Boolean).join('\n\n')
  const heading = useRef<HTMLHeadingElement>(null)
  const completed = useRef(false)
  const remoteSessionId = useRef<string | null>(null)
  const finishing = useRef(false)
  const autoFinishAttempted = useRef(false)
  const [finishError, setFinishError] = useState('')
  const { state: recordingState, file: recordingFile, start: startRecording, stop: stopRecording, reset: resetRecording } = usePracticeRecording()

  const { stopMicrophone } = speech
  const finish = useCallback(async () => {
    if (completed.current || finishing.current) return
    finishing.current = true
    stopMicrophone()
    stopRecording()
    setFinishError('')
    try {
      if (accessToken && remoteSessionId.current) await savePracticeEnd(accessToken, remoteSessionId.current)
    } catch {
      setFinishError(language === 'ar' ? 'تعذّر حفظ وقت النهاية. اضغطي «إنهاء التدريب» مرة ثانية.' : 'Could not save the end time. Select End practice to retry.')
      return
    } finally {
      finishing.current = false
    }
    completed.current = true
    setSession({ phase: 'finished' })
    onComplete(interview?.type)
  }, [accessToken, interview?.type, language, onComplete, stopMicrophone, stopRecording])

  useEffect(() => {
    heading.current?.focus()
  }, [session.phase])

  useEffect(() => {
    if (session.phase !== 'running' || paused) return

    function updateTime(deadline: number) {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0 && !autoFinishAttempted.current) {
        autoFinishAttempted.current = true
        void finish()
      }
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

  const presentationAttachment = !isInterview && session.phase !== 'ready' ? roomSettings.current?.attachment : null
  useEffect(() => {
    setSlideTexts([])
    setSlideIndex(0)
    setSlideStatus('idle')
    if (!presentationAttachment) return

    let cancelled = false
    setSlideStatus('loading')
    void readPresentationSlides(presentationAttachment).then((items) => {
      if (cancelled) return
      setSlideTexts(items)
      setSlideStatus('idle')
    }).catch(() => {
      if (!cancelled) setSlideStatus('error')
    })
    return () => { cancelled = true }
  }, [presentationAttachment])

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
    if (!preparingQuestion || !paused || session.phase !== 'running' || speech.busy || slideStatus === 'loading') return
    const fallback = questionFromSlides(speech.transcript, slideTexts, language) ?? buildAudienceQuestion(speech.transcript, language, presentationTopic)
    const controller = new AbortController()
    async function openQuestion() {
      let question = fallback
      if (usePresentationAI && presentationAIAvailable && (speech.transcript.trim() || slideTexts.some((slide) => slide.trim()))) {
        try {
          const result = await requestPresentationAI({ transcript: speech.transcript, slides: slideTexts, topic: presentationTopic, language }, 'question', accessToken, controller.signal)
          if (typeof result.question === 'string' && result.question.trim()) question = { text: result.question, audio: null }
        } catch {
          // The prepared question remains available if the service fails.
        }
      }
      if (controller.signal.aborted) return
      setAudienceQuestion(question)
      setPreparingQuestion(false)
    }
    void openQuestion()
    return () => controller.abort()
  }, [preparingQuestion, paused, session.phase, speech.busy, speech.transcript, language, presentationTopic, slideStatus, slideTexts, accessToken, usePresentationAI])

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
    const api = process.env.NEXT_PUBLIC_TALEEQ_API_URL
    if (!next || !api) return
    setGeneratingInterviewQuestion(true)
    const token = generation.current
    void (async () => {
      try {
        const response = await fetch(api.replace(/\/$/, '') + '/ai/interview/question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}) },
          body: JSON.stringify({
            role: interview?.jobTitle || 'General interview',
            cv: cvText.slice(0, 16000),
            job_description: (interview?.jobDescription ?? '').slice(0, 12000),
            interviewer: nextRole, language,
            history: turns.map(t => ({ question: t.question.slice(0, 600), answer: t.answer.slice(0, 6000) })),
          }),
          signal: AbortSignal.timeout(30000),
        })
        if (!response.ok) return
        const result = await response.json()
        if (generation.current === token && typeof result.question === 'string' && result.question.trim()) {
          setInterviewFollowUp(result.question.trim())
        }
      } catch { /* Keep local fallback. */ }
      finally { if (generation.current === token) setGeneratingInterviewQuestion(false) }
    })()
  }, [submittingInterviewAnswer, session.phase, speech.busy, speech.transcript, speech.setTranscript, interviewTurns, interviewQuestion, language, interview, jobQuestions, cvText, accessToken])

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

  async function startPractice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingStart.current || readingJobFile || readingCvFile) return
    const fields = new FormData(event.currentTarget)
    if (accessToken) {
      savingStart.current = true
      setIsSavingStart(true)
      setStartError('')
      try {
        remoteSessionId.current = await savePracticeStart(accessToken, isInterview ? 'interview' : 'presentation')
      } catch {
        setStartError(language === 'ar'
          ? 'تعذّر حفظ الجلسة. تأكدي أن السيرفر شغّال وحاولي مرة ثانية.'
          : 'Could not save the session. Check that the API is running and try again.')
        return
      } finally {
        savingStart.current = false
        setIsSavingStart(false)
      }
    }
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

  async function retryPresentation() {
    const settings = roomSettings.current
    if (!settings || speech.busy || savingStart.current) return
    if (accessToken) {
      savingStart.current = true
      setIsSavingStart(true)
      setFinishError('')
      try {
        remoteSessionId.current = await savePracticeStart(accessToken, 'presentation')
      } catch {
        setFinishError(language === 'ar' ? 'تعذّر حفظ جلسة جديدة. حاولي مرة ثانية.' : 'Could not save a new session. Try again.')
        return
      } finally {
        savingStart.current = false
        setIsSavingStart(false)
      }
    }

    previousCameraSamples.current = cameraSamples.current
    cameraSamples.current = emptyCameraSamples()
    voiceSamples.current = { voiced: 0, pitch: [] }
    setPreparingQuestion(false)
    setPreviousAttempt(speech.transcript)
    speech.setTranscript('')
    completed.current = false
    autoFinishAttempted.current = false
    resetRecording()
    setAudienceQuestion(null)
    setAudienceAnswer(null)
    setPresentationReview(null)
    setPaused(false)
    setSlides(false)
    setCamera(false)
    setMediaError(false)
    setVideoError('')
    setVideoBlocked(false)
    setSecondsLeft(startedWithSeconds.current)
    setSession({ phase: 'running', deadline: Date.now() + startedWithSeconds.current * 1000, ...settings })
  }

  function closeAudienceQuestion(answer: string, next: () => void) {
    if (audienceQuestion && answer.trim()) {
      setAudienceAnswer({ question: audienceQuestion.text, answer: answer.trim() })
    }
    setAudienceQuestion(null)
    next()
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
              <video autoPlay loop muted playsInline aria-label={ar ? 'ثلاثة محاورين' : 'Three interviewers'} poster={`${process.env.NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH ?? ''}/Three-Person%20Office%20Interview%20Panel.png`} src={`${process.env.NEXT_PUBLIC_GITHUB_PAGES_BASE_PATH ?? ''}/interview-idle.mp4`} className="h-full w-full object-cover object-center" />
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
        {camera && <CameraFeedback preview={preview} samples={cameraSamples.current} language={language} paused={paused} analyzeBody={!isInterview} voice={!isInterview ? voiceSamples.current : undefined} />}
        {!isInterview && !paused && speech.status === 'listening' && <PresentationVoiceMonitor samples={voiceSamples.current} />}
        {mediaError && <p role="alert" className="absolute bottom-32 start-4 rounded-lg bg-black/85 p-3 text-sm">{ar ? 'تحقق من أذونات الكاميرا والمايك' : 'Check camera and microphone permissions'}</p>}
        {(speech.status === 'unavailable' || speech.status === 'error') && <p role="status" className="absolute end-4 top-24 max-w-xs rounded-lg bg-black/80 p-2 text-xs">{ar ? 'التفريغ الصوتي غير متاح. تحقق من المايك أو استخدم Chrome.' : 'Voice transcription unavailable. Check your microphone or try Chrome.'}</p>}
        {isInterview && (
          <section className="absolute inset-x-4 bottom-28 mx-auto max-w-3xl rounded-xl bg-black/65 px-3 py-2 text-center backdrop-blur-sm sm:bottom-28">
            {interviewComplete ? (
              <p role="status" className="text-sm">{ar ? 'انتهت الأسئلة. يمكن إنهاء التدريب لعرض التقرير.' : 'Questions complete. End the session to see your report.'}</p>
            ) : (
              <>
                <p aria-live="polite" className="mx-auto max-h-16 overflow-auto text-sm font-medium leading-relaxed text-white">{generatingInterviewQuestion ? (ar ? 'جاري تحضير السؤال…' : 'Preparing the question…') : interviewQuestion}</p>
                <p role="status" className="mt-1 text-xs text-white/70">{generatingInterviewQuestion ? (ar ? 'جاري توليد السؤال' : 'Generating question') : speakingInterviewer ? (ar ? 'المحاور يتحدث' : 'Interviewer speaking') : speech.busy ? (ar ? 'جاري الاستماع…' : 'Listening…') : (ar ? 'اضغط على المايك للإجابة' : 'Tap the mic to answer')}</p>
              </>
            )}
          </section>
        )}
        <footer className="absolute inset-x-0 bottom-0 flex justify-center p-4 sm:p-7">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-3xl border border-white/15 bg-[#142332]/90 p-2 shadow-2xl backdrop-blur-xl sm:gap-3 sm:p-3">
            {[
              { label: ar ? 'المايك' : 'Mic', active: speech.busy, Icon: speech.busy ? Mic : MicOff, action: () => { if (speech.status === 'listening') stopMicrophone(); else if (!paused && !speech.busy && !submittingInterviewAnswer && !generatingInterviewQuestion && !interviewComplete && !speakingInterviewer) speech.startMicrophone() } },
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
            {isInterview && !interviewComplete && <button type="button" disabled={paused || speakingInterviewer || submittingInterviewAnswer || generatingInterviewQuestion || (!speech.busy && !speech.transcript.trim())} onClick={() => { setSubmittingInterviewAnswer(true); stopMicrophone() }} className="rounded-xl border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50">{submittingInterviewAnswer ? (ar ? 'جاري التحضير…' : 'Preparing…') : (ar ? 'السؤال التالي' : 'Next question')}</button>}
            <span className="h-8 w-px bg-white/20"/>
            {accessToken && (
              <button type="button"
                className="rounded-xl border border-white/25 px-3 py-2 text-sm disabled:opacity-50"
                disabled={recordingState === 'starting' || recordingState === 'stopping' || recordingState === 'ready'}
                onClick={recordingState === 'recording' ? stopRecording : startRecording}>
                {recordingState === 'recording' ? (ar ? 'إيقاف التسجيل' : 'Stop recording')
                  : recordingState === 'ready' ? (ar ? 'التسجيل جاهز للحفظ' : 'Recording ready to save')
                  : (ar ? 'تسجيل الجلسة' : 'Record session')}
              </button>
            )}
            <button type="button" onClick={finish} className="flex items-center gap-2 rounded-2xl bg-[#c65b40] px-3 py-3 text-xs font-semibold hover:bg-[#ad4931]"><Square size={16} fill="currentColor"/> {text.finish}</button>
            {recordingState === 'starting' && <p role="status" className="basis-full text-center text-xs">{ar ? 'اختاري تبويب طليق وفعّلي مشاركة صوت التبويب.' : 'Choose the Taleeq tab and share tab audio.'}</p>}
            {recordingState === 'error' && <p role="alert" className="basis-full text-center text-xs">{ar ? 'تعذّر التسجيل. اختاري تبويب طليق واسمحي بالمايك.' : 'Recording failed. Choose the Taleeq tab and allow the microphone.'}</p>}
          </div>
          {finishError && <p role="alert" className="mt-2 text-center text-sm text-white">{finishError}</p>}
        </footer>
        {audienceQuestion && (
          <AudienceQuestion
            question={audienceQuestion}
            language={language}
            onClose={(answer) => closeAudienceQuestion(answer, togglePause)}
            onFinish={(answer) => closeAudienceQuestion(answer, finish)}
          />
        )}
      </section>, document.body
    )
  }

  return (
    <section id="practice-session" aria-labelledby="practice-session-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <h1 ref={heading} tabIndex={-1} id="practice-session-heading" className="text-2xl font-semibold tracking-tight">
        {session.phase === 'finished' ? (language === 'ar' ? 'رحلة تطوّرك تبدأ هنا' : 'Your growth starts here') : session.phase === 'ready' ? (isInterview ? (language === 'ar' ? 'لنستعد لمقابلتك القادمة' : 'Prepare for your next interview') : practice.setup) : practice.running}
      </h1>
      {finishError && <p role="alert" className="mt-3 text-sm text-red-600">{finishError}</p>}
      {session.phase === 'finished' && (() => {
        const ar = language === 'ar'
        const transcript = isInterview ? interviewReportTranscript : speech.transcript
        const words = transcript.trim().split(/\s+/).filter(Boolean).length
        const elapsed = Math.max(0, startedWithSeconds.current - secondsLeft)
        const turns = [...interviewTurns, ...(isInterview && speech.transcript.trim() ? [{ question: interviewQuestion, answer: speech.transcript }] : [])]
        const reviews = turns.map((turn, index) => {
          const result = analyzeTranscript({ transcript: turn.answer, language, mode: index % 3 === 1 ? 'technical' : 'personal' })
          const assessment = aiFeedback?.answers.find(answer => answer.index === index)
          return {
            ...turn,
            result,
            verdict: assessment?.verdict ? answerVerdicts[assessment.verdict]?.[language] : undefined,
            feedback: assessment?.feedback,
            improvement: assessment?.improvement || result?.note,
          }
        })
        const overall = analyzeTranscript({ transcript, language, mode: isInterview ? 'personal' : 'presentation', presentationTopic })
        const notes = [...new Set(isInterview ? reviews.flatMap(r => r.result ? [r.result.note] : []) : overall ? [overall.note] : [])].slice(0, 3)
        const presentationResult = presentationReview?.transcript === transcript ? presentationReview.result : null
        const audienceFeedback = presentationResult?.audience_feedback
        const presentationComments = [
          ...(presentationResult && transcript.trim() ? [presentationResult.summary, presentationResult.strength, presentationResult.gap, presentationResult.next_step] : []),
          ...(audienceFeedback ? [audienceFeedback.feedback, audienceFeedback.improvement] : []),
        ]
        const savedComments = (aiFeedback
          ? [aiFeedback.summary, ...aiFeedback.strengths, ...aiFeedback.improvements, ...aiFeedback.answers.flatMap(answer => [answer.feedback, answer.improvement]), ...aiFeedback.action_plan]
          : [...notes, ...presentationComments]).filter(Boolean).slice(0, 30).map(comment => comment.slice(0, 2000))
        const roles = ar ? ['الموارد البشرية', 'المحاور التقني', 'مدير التوظيف'] : ['HR Interviewer', 'Technical Interviewer', 'Hiring Manager']
        const colors = ['bg-[#FCD4A5] text-[#85420F]', 'bg-[#DCD0FA] text-[#50348A]', 'bg-[#BCE8D2] text-[#175D43]']
        const stats = [{ label: ar ? 'مدة التدريب التقريبية' : 'Approximate duration', value: Math.floor(elapsed / 60) + ':' + String(elapsed % 60).padStart(2, '0') }, { label: isInterview ? (ar ? 'الإجابات' : 'Answers') : (ar ? 'ظهور الوجه' : 'Face visibility'), value: isInterview ? turns.length : cameraSamples.current.total >= 8 ? Math.round(100 * cameraSamples.current.visible / cameraSamples.current.total) + '%' : '—' }, { label: ar ? 'عدد الكلمات' : 'Words', value: words }]
        return <div className="mt-5 space-y-5 rounded-2xl bg-[#F0F4FA] p-3 text-[#182D43] sm:p-6">
          <div className="rounded-2xl bg-gradient-to-br from-[#142B49] to-[#315B82] p-6 text-white">
            <p className="text-sm font-medium text-[#F4B77C]">{ar ? 'طليق · تقرير الأداء' : 'Taleek · Performance report'}</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{ar ? 'كل محاولة تصنع فرقًا.' : 'Every attempt makes a difference.'}</h2>
            <p className="mt-2 text-sm text-slate-200">{isInterview ? interview?.jobTitle : presentationTopic || practice.running}</p>
            <p className="mt-4 border-t border-white/20 pt-3 text-sm text-slate-200">{ar ? 'ملاحظات مبنية على النص وعينات الكاميرا المتاحة، وليست تقييمًا مهنيًا نهائيًا.' : 'Feedback is based on available transcript and camera samples, not a definitive professional assessment.'}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">{stats.map((stat, i) => <div key={stat.label} className={`rounded-xl p-3 sm:p-5 ${colors[i]}`}><svg className="mb-3 h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{i === 0 ? <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></> : i === 1 ? <><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/></> : <path d="M3 10v4m4-7v10m5-14v18m5-14v10m4-7v4"/>}</svg><p className="text-3xl font-bold tabular-nums text-[#182D43] text-start" dir="ltr">{stat.value}</p><p className="mt-2 text-xs font-medium">{stat.label}</p></div>)}</div>
          {isInterview && aiFeedbackStatus === 'loading' && <div role="status" className="rounded-xl bg-white p-5 animate-pulse">{ar ? 'جاري تحليل إجاباتك بالذكاء الاصطناعي…' : 'AI is reviewing your answers…'}</div>}
          {isInterview && aiFeedbackStatus === 'error' && <p role="status" className="rounded-xl bg-white p-4 text-sm">{ar ? 'تعذر التحليل الذكي. التقرير المحلي متاح أدناه.' : 'AI feedback unavailable. Local feedback is available below.'}</p>}
          {isInterview && aiFeedback && <section className="space-y-4 rounded-2xl bg-white p-5 text-[#142B49]">
            <div className="flex items-center gap-5"><div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 border-[#29966B] text-3xl font-bold">{aiFeedback.score}<span className="text-xs">/100</span></div><div><h2 className="text-xl font-bold">{ar ? 'تقييم المقابلة الذكي' : 'AI interview review'}</h2><p className="mt-2 text-sm">{aiFeedback.summary}</p></div></div>
            <p className="text-xs text-slate-600">{ar ? 'تقدير تدريبي لجودة الإجابات، وليس قرار توظيف.' : 'Practice estimate of answer quality, not a hiring decision.'}</p>
            {aiFeedback.interviewer_scores.map((score, i) => <div key={i}><div className="flex justify-between text-sm"><span>{roles[i]}</span><strong>{score === null ? '—' : score + '%'}</strong></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#315B82]" style={{ width: (score ?? 0) + '%' }} /></div></div>)}
            <div className="grid gap-3 md:grid-cols-2">{[{ title: ar ? 'نقاط القوة' : 'Strengths', items: aiFeedback.strengths, color: '#CDEBDD' }, { title: ar ? 'فرص التحسين' : 'Improvements', items: aiFeedback.improvements, color: '#FCD4A5' }].map(group => <div key={group.title} className="rounded-xl p-4" style={{ background: group.color }}><h3 className="font-bold">{group.title}</h3><ul className="mt-2 list-disc space-y-2 ps-5 text-sm">{group.items.map((item, i) => <li key={i}>{item}</li>)}</ul></div>)}</div>
            <div className="rounded-xl bg-[#DCD0FA] p-4"><h3 className="font-bold">{ar ? 'خطة تطوير مخصصة' : 'Personal action plan'}</h3><ol className="mt-2 list-decimal space-y-2 ps-5 text-sm">{aiFeedback.action_plan.map((item, i) => <li key={i}>{item}</li>)}</ol></div>
          </section>}
          {!isInterview && !speech.busy && slideStatus !== 'loading' && <PresentationAIReview
            key={transcript}
            source={{ transcript, slides: slideTexts, topic: presentationTopic, language, audience_answer: audienceAnswer ?? undefined }}
            token={accessToken}
            automatic={usePresentationAI}
            onResult={setPresentationReview}
          />}
          <h2 className="text-xl font-bold">{ar ? 'نظرة على أدائك' : 'Performance overview'}</h2>
          <div className="rounded-xl bg-white p-4">
            <details className="mb-3 text-sm text-slate-500"><summary className="cursor-pointer">{text.assessment}</summary><AssessmentCriteria title={text.assessment} criteria={isInterview ? [...new Set([...practice.criteria, ...interviewText.technicalCriteria])] : practice.criteria} /></details>
            {!isInterview && overall && <div className="flex items-start gap-4 py-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#BCE8D2] text-[#175D43]"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16v12H9l-5 4z"/><path d="M8 8h8m-8 4h5"/></svg></div><div className="flex-1"><h3 className="font-semibold">{ar ? "محتوى الكلام" : "Speech content"}</h3>{overall.evidence && <p className="mt-1 text-sm text-[#35664F]">{overall.evidence}</p>}<p className="mt-2 text-sm text-[#985321]">{overall.note}</p></div></div>}
            {!isInterview && !overall && <p className="mt-3 text-sm">{ar ? 'لا يوجد نص كافٍ للتحليل.' : 'Not enough transcript for analysis.'}</p>}
            <CameraFeedbackReport samples={cameraSamples.current} previous={previousCameraSamples.current} language={language} />
            {!isInterview && <PresentationFeedback transcript={transcript} slides={slideTexts} voice={voiceSamples.current} language={language} />}
          </div>
          {isInterview && <><h2 className="text-xl font-bold">{ar ? 'مراجعة الأسئلة والإجابات' : 'Question and answer review'}</h2>
          {reviews.map((review, i) => (
            <details key={i} open={i === 0} className="rounded-xl bg-white p-4">
              <summary className="cursor-pointer font-semibold">
                <span className={`me-2 inline-block rounded-lg px-2 py-1 text-xs ${colors[i % 3]}`}>{i + 1} · {roles[i % 3]}</span>
                {review.question}
              </summary>
              <div className="mt-4 space-y-3 border-t border-slate-200 pt-3 text-sm">
                <p className="font-medium">{ar ? 'إجابتك' : 'Your answer'}</p>
                <p dir="auto" className="whitespace-pre-wrap">{review.answer}</p>
                <div className="space-y-2 rounded-lg bg-[#F0F4FA] p-3">
                  <p className="font-semibold">{review.verdict ?? (aiFeedbackStatus === 'loading'
                    ? (ar ? 'جاري تقييم الإجابة…' : 'Assessing answer…')
                    : (ar ? 'الحكم على صحة الإجابة غير متاح' : 'Correctness assessment unavailable'))}</p>
                  {review.feedback && <p dir="auto">{review.feedback}</p>}
                  {review.improvement && <p><strong>{ar ? 'اقتراح للتحسين' : 'Suggested improvement'}</strong><br />{review.improvement}</p>}
                </div>
              </div>
            </details>
          ))}</>}
          <div className="rounded-xl bg-[#CDEBDD] p-5"><h2 className="text-lg font-bold">{ar ? 'خطة التدريب القادمة' : 'Next practice plan'}</h2>{notes.length ? <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm">{notes.map(note => <li key={note}>{note}</li>)}</ol> : <p className="mt-2 text-sm">{ar ? 'سجّل إجابة أو عرضًا للحصول على ملاحظات مخصصة.' : 'Record an answer or presentation for tailored feedback.'}</p>}</div>
          <details className="rounded-xl bg-white p-4"><summary className="cursor-pointer font-semibold">{ar ? 'النص الكامل والمراجعة' : 'Full transcript and revision'}</summary><PracticeAnalysis presentationTopic={presentationTopic} previousAttempt={previousAttempt} speech={isInterview ? { ...speech, transcript: interviewReportTranscript, setTranscript: value => setInterviewTranscriptEdit(typeof value === 'function' ? value(interviewReportTranscript) : value) } : speech} language={language} mode={isInterview ? 'personal' : 'presentation'} running={false} /></details>
          {accessToken && remoteSessionId.current && (recordingFile || savedComments.length > 0)
            && recordingState !== 'stopping' && aiFeedbackStatus !== 'loading' && !speech.busy && (
              <SaveSessionRecording key={remoteSessionId.current + (presentationResult ? "-presentation-review" : "")} token={accessToken}
                sessionId={remoteSessionId.current} arabic={ar} recording={recordingFile} comments={savedComments} />
          )}
          <Button type="button" variant="outline" onClick={() => {
            const report = [ar ? 'طليق - تقرير الأداء' : 'Taleek - Performance report', ...stats.map(x => x.label + ': ' + x.value), ...reviews.map(r => [r.question, r.answer, r.verdict, r.feedback, r.improvement].filter(Boolean).join('\n')), transcript, ...notes, ...(presentationResult?.score != null ? [String(presentationResult.score) + '/100'] : []), ...(audienceFeedback && audienceAnswer ? [audienceAnswer.question, audienceAnswer.answer] : []), ...presentationComments, ...(aiFeedback ? [String(aiFeedback.score) + '/100', aiFeedback.summary, ...aiFeedback.strengths, ...aiFeedback.improvements, ...aiFeedback.action_plan] : [])].join('\n\n')
            const url = URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }))
            const link = document.createElement('a'); link.href = url; link.download = 'taleek-report.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
          }}>{ar ? 'حفظ التقرير' : 'Download report'}</Button>
        </div>
      })()}
      {session.phase === 'ready' && isInterview && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{language === 'ar' ? 'أخبرنا عن الوظيفة التي تستهدفها لنخصص أسئلة المقابلة وفقًا لها.' : 'Tell us about your target role so we can tailor your interview questions.'}</p>}
      {session.phase === 'ready' ? (
        <form className={isInterview ? "mt-5 grid gap-4 lg:grid-cols-2 lg:items-stretch" : "mt-4"} onSubmit={startPractice}>

          {!isInterview && (
            <label className="mb-4 block text-sm font-medium">
              {language === 'ar' ? 'موضوع العرض (اختياري)' : 'Presentation topic (optional)'}
              <input name="presentation-topic" className={fieldClass} dir="auto" maxLength={160} />
            </label>
          )}
          {!isInterview && presentationAIAvailable && (
            <label className="mb-4 flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={usePresentationAI} onChange={(event) => setUsePresentationAI(event.target.checked)} />
              {language === 'ar' ? 'فعّل سؤال الجمهور وتقييم العرض بالذكاء الاصطناعي. يُرسل نص العرض والشرائح إلى Groq، وتُرسل إجابتك على سؤال الجمهور عند إعداد التقييم.' : 'Enable AI audience questions and presentation feedback. The transcript and slide text are sent to Groq, along with your audience answer when generating feedback.'}
            </label>
          )}
          {isInterview && (
            <div className="grid content-start gap-4 rounded-2xl border border-primary-border bg-primary-soft p-4 lg:row-span-2 lg:grid-rows-[auto_auto_1fr]"><div className="flex items-center gap-3"><span className="rounded-xl bg-primary px-3 py-2 font-bold text-white">01</span><div><h2 className="font-bold text-[#182D43]">{language === "ar" ? "الوظيفة المستهدفة" : "Target role"}</h2><p className="text-xs text-slate-600">{language === "ar" ? "لنخصص الأسئلة حسب المجال ومتطلبات الوظيفة." : "Tailor questions to the role and its requirements."}</p></div></div>
              <div>
                <label htmlFor="job-title" className="block text-sm font-medium">{language === "ar" ? "ما الوظيفة التي تستعد للمقابلة من أجلها؟" : "What role are you interviewing for?"}</label>
                <input
                  id="job-title"
                  name="job-title"
                  dir={language === "ar" ? "rtl" : "ltr"}
                  required
                  maxLength={120}
                  pattern={String.raw`.*\S.*`}
                  placeholder={interviewText.jobTitlePlaceholder}
                  className={fieldClass + " text-start"}
                />
              </div>
              <div className="flex min-h-0 flex-col">
                <label htmlFor="job-description" className="block text-sm font-medium">{language === "ar" ? "ما المهارات والمسؤوليات المطلوبة؟ (اختياري)" : "What skills and responsibilities are required? (Optional)"}</label>
                <textarea
                  id="job-description"
                  name="job-description"
                  value={jobDescriptionDraft}
                  readOnly={readingJobFile}
                  onChange={(event) => setJobDescriptionDraft(event.target.value)}
                  dir={language === "ar" ? "rtl" : "ltr"}
                  rows={4}
                  maxLength={4000}
                  placeholder={language === 'ar' ? 'مثال: تطوير واجهات باستخدام React، العمل ضمن فريق، واختبار التطبيقات.' : 'Paste the job requirements to tailor interview questions'}
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
          {isInterview && (
            <div className="space-y-3 rounded-2xl border border-[#C4D3E4] bg-[#E8EFF8] p-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-[#17283F] px-3 py-2 font-bold text-white">02</span><div><h2 className="font-bold text-[#182D43]">{language === "ar" ? "مستندات تساعدنا على تخصيص المقابلة" : "Personalize with documents"}</h2><p className="text-xs text-slate-600">{language === "ar" ? "يمكن إرفاق إعلان الوظيفة أو السيرة الذاتية (اختياري)." : "Optionally attach the job posting or your CV."}</p></div></div>
              <InterviewDocument kind="job" language={language} onText={setJobDescriptionDraft} onLoading={setReadingJobFile} />
              <InterviewDocument kind="cv" language={language} onText={setCvText} onLoading={setReadingCvFile} />
            </div>
          )}
          <div className="rounded-2xl border border-[#C7E4D5] bg-[#E9F6EF] p-4">
            {isInterview && <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-[#267354] px-3 py-2 font-bold text-white">03</span><h2 className="font-bold text-[#182D43]">{language === "ar" ? "إعدادات الجلسة" : "Session settings"}</h2></div>}
            <label htmlFor="session-minutes" className="block text-sm font-medium">{language === "ar" ? "كم دقيقة تريد أن تستمر الجلسة؟" : "How many minutes would you like to practice?"}</label>
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
          {!isInterview && (
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
          <p className="mb-2 text-xs leading-relaxed text-muted-foreground lg:col-span-2">{language === "ar" ? "قد يرسل المتصفح الصوت إلى خدمة تحويل الكلام إلى نص عند تشغيل المايك." : "Your browser may send audio to a transcription service when the mic is on."}</p>
          {startError && <p role="alert" className="mb-3 text-sm text-red-600 lg:col-span-2">{startError}</p>}
          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Button className="bg-primary px-6 text-white hover:bg-primary-hover" type="submit" disabled={isSavingStart || readingJobFile || readingCvFile}>{isInterview ? (language === "ar" ? "ابدأ المقابلة" : "Start interview") : text.start}</Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSavingStart}>{text.cancel}</Button>
          </div>
        </form>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          {session.phase === 'finished' && !isInterview && (
            <Button type="button" disabled={speech.busy || isSavingStart} onClick={retryPresentation}>
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
