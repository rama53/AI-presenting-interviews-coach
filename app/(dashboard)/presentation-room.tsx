'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode, type RefObject } from 'react'
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Check,
  Clock3,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Pause,
  Play,
  SlidersHorizontal,
  VolumeX,
  Waves,
  X,
} from 'lucide-react'
import type { DashboardCopy, Language } from './copy'
import audienceImage from './taleek-audience-room.png'

type Phase = 'setup' | 'running' | 'paused' | 'finished'
type AmbientCue = 'murmur' | 'rustle' | 'cough' | 'chair'
type AudienceDifficulty = 'relaxed' | 'engaged' | 'challenging'
type AudienceReactionKind = 'nod' | 'shift' | 'glance' | 'note'

const audiencePeople = [
  { x: 9, y: 53 }, { x: 20, y: 52 }, { x: 31, y: 47 }, { x: 43, y: 54 },
  { x: 54, y: 50 }, { x: 66, y: 55 }, { x: 78, y: 50 }, { x: 90, y: 54 },
  { x: 27, y: 37 }, { x: 48, y: 37 }, { x: 71, y: 36 },
]

type PresentationRoomProps = {
  language: Language
  languageControl: ReactNode
  text: DashboardCopy
  defaultMinutes: number
  onClose: () => void
  onComplete: () => void
}

const acceptedSlideTypes = '.pdf,.ppt,.pptx,.doc,.docx'

export function PresentationRoom({ language, languageControl, text, defaultMinutes, onClose, onComplete }: PresentationRoomProps) {
  const roomText = text.presentationRoom
  const [phase, setPhase] = useState<Phase>('setup')
  const [secondsLeft, setSecondsLeft] = useState(defaultMinutes * 60)
  const remainingRef = useRef(defaultMinutes * 60)
  const [audienceSize, setAudienceSize] = useState(0)
  const [difficulty, setDifficulty] = useState<AudienceDifficulty>('engaged')
  const [ambientVolume, setAmbientVolume] = useState(22)
  const volumeRef = useRef(22)
  const [slidesFile, setSlidesFile] = useState<File | null>(null)
  const [slidesUrl, setSlidesUrl] = useState<string | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null)
  const [showWebcam, setShowWebcam] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [mediaErrorKind, setMediaErrorKind] = useState<'camera' | 'microphone' | null>(null)
  const [activeReaction, setActiveReaction] = useState<{ index: number; kind: AudienceReactionKind; revision: number } | null>(null)
  const [slidesVisible, setSlidesVisible] = useState(false)
  const [slidesCollapsed, setSlidesCollapsed] = useState(false)
  const [slidesWidth, setSlidesWidth] = useState(360)
  const [soundSettingsOpen, setSoundSettingsOpen] = useState(false)
  const roomRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const microphoneStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const noiseBufferRef = useRef<AudioBuffer | null>(null)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const getAudioEngine = useCallback(() => {
    const AudioContextConstructor = window.AudioContext
    if (!AudioContextConstructor) return null

    let context = audioContextRef.current
    if (!context || context.state === 'closed') {
      context = new AudioContextConstructor()
      audioContextRef.current = context
      noiseBufferRef.current = null
    }
    if (context.state === 'suspended') void context.resume()

    if (!noiseBufferRef.current) {
      const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
      const samples = buffer.getChannelData(0)
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] = Math.random() * 2 - 1
      }
      noiseBufferRef.current = buffer
    }

    return { context, buffer: noiseBufferRef.current }
  }, [])

  const playNoise = useCallback((cue: AmbientCue, startAt?: number, volumeScale = 1) => {
    const engine = getAudioEngine()
    const volume = volumeRef.current
    if (!engine || volume <= 0) return

    const { context, buffer } = engine
    const now = startAt ?? context.currentTime
    const duration = cue === 'murmur' ? 2.2 : cue === 'cough' ? 0.48 : cue === 'rustle' ? 1.05 : 0.85
    const filter = context.createBiquadFilter()
    filter.type = cue === 'murmur' ? 'lowpass' : cue === 'chair' ? 'bandpass' : 'highpass'
    filter.frequency.value = cue === 'murmur' ? 260 : cue === 'rustle' ? 1250 : cue === 'cough' ? 820 : 430
    filter.Q.value = cue === 'chair' ? 2.8 : cue === 'cough' ? 0.8 : 0.55

    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const gain = context.createGain()
    const baseVolume = cue === 'murmur' ? 0.018 : cue === 'cough' ? 0.026 : cue === 'chair' ? 0.032 : 0.025
    const peak = Math.max(0.0001, volume * volumeScale * baseVolume)
    gain.gain.setValueAtTime(0.0001, now)
    if (cue === 'rustle') {
      gain.gain.linearRampToValueAtTime(peak * 0.7, now + 0.11)
      gain.gain.linearRampToValueAtTime(peak * 0.18, now + 0.34)
      gain.gain.linearRampToValueAtTime(peak, now + 0.52)
      gain.gain.linearRampToValueAtTime(peak * 0.42, now + 0.76)
    } else if (cue === 'cough') {
      gain.gain.linearRampToValueAtTime(peak, now + 0.06)
      gain.gain.linearRampToValueAtTime(peak * 0.12, now + 0.16)
      gain.gain.linearRampToValueAtTime(peak * 0.8, now + 0.25)
    } else {
      gain.gain.linearRampToValueAtTime(peak, now + (cue === 'murmur' ? 0.4 : 0.08))
      gain.gain.linearRampToValueAtTime(peak * 0.5, now + duration * 0.48)
    }
    gain.gain.linearRampToValueAtTime(0.0001, now + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(context.destination)
    source.start(now)
    source.stop(now + duration + 0.02)

    if (cue === 'murmur') {
      const tone = context.createOscillator()
      const toneGain = context.createGain()
      tone.type = 'sine'
      tone.frequency.value = 92 + Math.random() * 48
      toneGain.gain.setValueAtTime(0.0001, now)
      toneGain.gain.linearRampToValueAtTime(peak * 0.12, now + 0.45)
      toneGain.gain.linearRampToValueAtTime(0.0001, now + duration)
      tone.connect(toneGain)
      toneGain.connect(context.destination)
      tone.start(now)
      tone.stop(now + duration + 0.02)
    }
  }, [getAudioEngine])

  const clearMedia = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    microphoneStreamRef.current = null
    setCameraStream(null)
    setMicrophoneStream(null)
  }, [])

  const finishSession = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    setPhase('finished')
    clearMedia()
    onCompleteRef.current()
  }, [clearMedia])
  const finishSessionRef = useRef(finishSession)
  finishSessionRef.current = finishSession

  useEffect(() => {
    if (!slidesFile) {
      setSlidesUrl(null)
      return
    }
    const nextUrl = URL.createObjectURL(slidesFile)
    setSlidesUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [slidesFile])

  useEffect(() => {
    if (showWebcam && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream
    }
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [cameraStream, showWebcam])

  useEffect(() => {
    if (phase !== 'running') return
    const timer = window.setInterval(() => {
      const nextValue = Math.max(0, remainingRef.current - 1)
      remainingRef.current = nextValue
      setSecondsLeft(nextValue)
      if (nextValue === 0) finishSessionRef.current()
    }, 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'running') return
    let timer: number
    const scheduleReaction = () => {
      const baseDelay = difficulty === 'relaxed' ? 6500 : difficulty === 'challenging' ? 3400 : 4800
      timer = window.setTimeout(() => {
        const index = Math.floor(Math.random() * audiencePeople.length)
        const kinds: AudienceReactionKind[] = ['nod', 'shift', 'glance', 'note']
        const kind = kinds[Math.floor(Math.random() * kinds.length)]
        setActiveReaction((current) => ({ index, kind, revision: (current?.revision ?? 0) + 1 }))
        scheduleReaction()
      }, baseDelay + Math.random() * 4800)
    }
    scheduleReaction()
    return () => window.clearTimeout(timer)
  }, [difficulty, phase])

  useEffect(() => {
    if (phase !== 'running' || ambientVolume === 0) return
    let timer: number
    const scheduleSound = () => {
      const baseDelay = difficulty === 'relaxed' ? 9000 : difficulty === 'challenging' ? 4500 : 6800
      timer = window.setTimeout(() => {
        const cues: AmbientCue[] = ['rustle', 'murmur', 'cough', 'chair']
        playNoise(cues[Math.floor(Math.random() * cues.length)])
        scheduleSound()
      }, baseDelay + Math.random() * 8500)
    }
    scheduleSound()
    return () => window.clearTimeout(timer)
  }, [ambientVolume, difficulty, phase, playNoise])

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === roomRef.current)
    document.addEventListener('fullscreenchange', updateFullscreen)
    return () => document.removeEventListener('fullscreenchange', updateFullscreen)
  }, [])

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop())
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close()
    }
  }, [])

  function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const duration = Number(fields.get('minutes'))
    const file = fields.get('slides')
    if (!Number.isInteger(duration) || duration < 1 || duration > 120) return

    const remaining = duration * 60
    remainingRef.current = remaining
    setSecondsLeft(remaining)
    setAudienceSize(Number(fields.get('audience-size')) || 0)
    setSlidesFile(file instanceof File && file.name ? file : null)
    getAudioEngine()
    setPhase('running')
  }

  function handleSlidesChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (file) setSlidesFile(file)
  }

  function handleVolumeChange(event: ChangeEvent<HTMLInputElement>) {
    const nextVolume = Number(event.currentTarget.value)
    volumeRef.current = nextVolume / 100
    setAmbientVolume(nextVolume)
  }

  async function toggleCamera() {
    setMediaError(null)
    setMediaErrorKind(null)
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
      setCameraStream(null)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError(roomText.mediaUnsupported)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      cameraStreamRef.current = stream
      setCameraStream(stream)
      setShowWebcam(true)
    } catch {
      setMediaError(roomText.mediaError)
      setMediaErrorKind('camera')
    }
  }

  async function toggleMicrophone() {
    setMediaError(null)
    setMediaErrorKind(null)
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((track) => track.stop())
      microphoneStreamRef.current = null
      setMicrophoneStream(null)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError(roomText.mediaUnsupported)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      microphoneStreamRef.current = stream
      setMicrophoneStream(stream)
    } catch {
      setMediaError(roomText.mediaError)
      setMediaErrorKind('microphone')
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === roomRef.current) {
        await document.exitFullscreen()
      } else {
        await roomRef.current?.requestFullscreen()
      }
    } catch {
      setMediaError(roomText.mediaError)
      setMediaErrorKind(null)
    }
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const seconds = (secondsLeft % 60).toString().padStart(2, '0')

  if (phase === 'setup') {
    return (
      <main dir={language === 'ar' ? 'rtl' : 'ltr'} className="min-h-[100svh] bg-sidebar text-sidebar-foreground">
        <header className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-7">
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring">
            <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
            <span>{text.back}</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-semibold tracking-wide sm:inline">طليق <span className="ms-1 text-xs font-normal text-sidebar-muted">TALEEQ</span></span>
            {languageControl}
          </div>
        </header>

        <div className="grid min-h-[calc(100svh-4rem)] lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative isolate flex min-h-[17rem] flex-col justify-end overflow-hidden p-6 sm:p-10 lg:min-h-[calc(100svh-4rem)] lg:p-14">
            <div role="img" aria-label={language === 'ar' ? 'جمهور يستمع إلى عرض في قاعة محاضرات' : 'An audience listening to a presentation in a lecture room'} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${audienceImage.src})` }} />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/45 to-sidebar/10" />
            <div className="relative max-w-xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-sidebar-primary">{roomText.setupEyebrow}</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{roomText.setupTitle}</h1>
              <p className="mt-3 max-w-lg text-sm leading-7 text-sidebar-muted sm:text-base">{roomText.setupDescription}</p>
            </div>
          </section>

          <section aria-labelledby="presentation-setup-title" className="flex items-center justify-center bg-background px-5 py-8 text-foreground sm:px-8 lg:px-12">
            <form onSubmit={startSession} className="w-full max-w-lg">
              <div className="mb-6">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{roomText.setupEyebrow}</span>
                <h2 id="presentation-setup-title" className="mt-2 text-2xl font-semibold text-foreground">{text.modes.presentation.setup}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{roomText.roomDescription}</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="presentation-minutes" className="block text-sm font-medium">{text.duration}</label>
                  <input id="presentation-minutes" name="minutes" type="number" min={1} max={120} defaultValue={defaultMinutes} required className="mt-1.5 block w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring" />
                </div>
                <div>
                  <label htmlFor="presentation-audience-size" className="block text-sm font-medium">{text.audienceSize}</label>
                  <select id="presentation-audience-size" name="audience-size" defaultValue="0" className="mt-1.5 block w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring">
                    {text.audienceOptions.map((option, index) => <option key={option} value={index}>{option}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="presentation-slides" className="block text-sm font-medium">{text.presentationFile}</label>
                <input id="presentation-slides" name="slides" type="file" accept={acceptedSlideTypes} className="mt-1.5 block w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm file:me-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:font-medium file:text-primary focus-visible:outline-2 focus-visible:outline-ring" />
                <p className="mt-1.5 text-xs text-muted-foreground">{roomText.slidesOptional}</p>
              </div>

              <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                {roomText.privacyNote}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <Play aria-hidden="true" className="size-4" />
                  {text.start}
                </button>
                <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  {text.cancel}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main ref={roomRef} dir={language === 'ar' ? 'rtl' : 'ltr'} aria-label={roomText.roomTitle} className="relative flex min-h-[100svh] flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div aria-hidden="true" className="room-photo-motion absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${audienceImage.src})` }} />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-sidebar/25 via-sidebar/5 to-sidebar/45" />
      {activeReaction && (() => {
        const person = audiencePeople[activeReaction.index]
        return (
          <div
            key={activeReaction.revision}
            aria-hidden="true"
            className={`audience-motion absolute inset-0 bg-cover bg-center audience-reacting audience-reacting-${activeReaction.kind}`}
            style={{
              backgroundImage: `url(${audienceImage.src})`,
              maskImage: `radial-gradient(ellipse 5vw 7vh at ${person.x}% ${person.y}%, #000 0%, rgb(0 0 0 / 0.8) 43%, transparent 100%)`,
              transformOrigin: `${person.x}% ${person.y}%`,
            }}
          />
        )
      })()}

      <header className="relative z-10 flex min-h-16 items-center gap-3 border-b border-white/10 bg-sidebar/30 px-4 py-3 backdrop-blur-sm sm:px-7">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sidebar-primary/40 bg-sidebar/55 text-sidebar-primary">
            <Waves aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold sm:text-sm">{roomText.roomTitle}</p>
            <p className="hidden text-xs text-sidebar-muted sm:block">{text.modes.presentation.running}</p>
          </div>
        </div>
        <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-4">
          {languageControl}
          {phase !== 'finished' && (
            <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-sidebar/55 px-3 font-mono text-sm tabular-nums sm:text-base" role="timer" aria-label={text.remaining}>
              <Clock3 aria-hidden="true" className="size-4 text-sidebar-primary" />
              <bdi dir="ltr">{minutes}:{seconds}</bdi>
            </div>
          )}
        </div>
      </header>

      <section className="relative z-10 flex min-h-0 flex-1 flex-col" aria-label={roomText.audienceLabel}>
        <p className="absolute start-4 top-4 rounded-full border border-white/25 bg-sidebar/45 px-3 py-1.5 text-xs font-medium text-white/90 shadow-sm backdrop-blur-sm sm:start-7 sm:top-6">
          {text.audienceOptions[audienceSize]}
        </p>

        {slidesVisible && (
          <SlidesPanel
            file={slidesFile}
            url={slidesUrl}
            text={roomText}
            collapsed={slidesCollapsed}
            width={slidesWidth}
            onFileChange={handleSlidesChange}
            onWidthChange={setSlidesWidth}
            onToggleCollapse={() => setSlidesCollapsed((collapsed) => !collapsed)}
            onClose={() => setSlidesVisible(false)}
          />
        )}

        {cameraStream && showWebcam && (
          <WebcamPanel videoRef={videoRef} text={roomText} />
        )}

        {phase === 'paused' && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-sidebar/60 px-4 backdrop-blur-sm">
            <div className="max-w-sm rounded-2xl border border-white/15 bg-sidebar/90 p-6 text-center shadow-2xl">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-sidebar-accent text-sidebar-primary"><Pause aria-hidden="true" className="size-5" /></span>
              <h2 className="mt-4 text-xl font-semibold">{roomText.paused}</h2>
              <p className="mt-2 text-sm leading-relaxed text-sidebar-muted">{roomText.pausedDescription}</p>
              <button type="button" onClick={() => setPhase('running')} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sidebar-primary px-4 py-2.5 text-sm font-semibold text-sidebar-primary-foreground transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring">
                <Play aria-hidden="true" className="size-4" />
                {roomText.resume}
              </button>
            </div>
          </div>
        )}

        {mediaError && (
          <div role="alert" className="absolute bottom-4 end-3 z-30 flex max-w-[min(92vw,26rem)] items-center gap-2 rounded-xl border border-white/20 bg-sidebar/75 px-3 py-2 text-xs text-white shadow-lg backdrop-blur-md sm:bottom-5 sm:end-6">
            <span className="min-w-0 flex-1 leading-relaxed">{mediaError}</span>
            {mediaErrorKind && (
              <button
                type="button"
                onClick={() => mediaErrorKind === 'camera' ? void toggleCamera() : void toggleMicrophone()}
                className="shrink-0 rounded-lg bg-sidebar-primary px-2.5 py-1.5 font-semibold text-sidebar-primary-foreground hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
              >
                {roomText.retry}
              </button>
            )}
            <button type="button" onClick={() => { setMediaError(null); setMediaErrorKind(null) }} aria-label={roomText.dismiss} className="grid size-7 shrink-0 place-items-center rounded-lg text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-sidebar-ring">
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        )}

        {phase === 'finished' && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-sidebar/60 px-4 backdrop-blur-sm">
            <section aria-labelledby="presentation-finished-title" className="w-full max-w-md rounded-3xl border border-white/15 bg-sidebar/95 p-7 text-center shadow-2xl sm:p-9">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-sidebar-primary/15 text-sidebar-primary"><Waves aria-hidden="true" className="size-6" /></span>
              <h2 id="presentation-finished-title" className="mt-5 text-2xl font-semibold">{roomText.finished}</h2>
              <ul className="mt-5 flex flex-col gap-2 text-start text-sm text-sidebar-muted">
                {text.modes.presentation.criteria.map((criterion) => <li key={criterion} className="leading-relaxed">{criterion}</li>)}
              </ul>
              <button type="button" onClick={onClose} className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-sidebar-primary px-5 py-2.5 text-sm font-semibold text-sidebar-primary-foreground transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring">
                {roomText.returnToDashboard}
              </button>
            </section>
          </div>
        )}
      </section>

      {phase !== 'finished' && (
        <footer className="relative z-10 px-2 pb-2 sm:px-5 sm:pb-4">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/20 bg-sidebar/75 p-1.5 shadow-xl backdrop-blur-xl sm:gap-3 sm:p-2">
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <button
                  type="button"
                  aria-label={roomText.soundSettings}
                  aria-haspopup="true"
                  aria-expanded={soundSettingsOpen}
                  aria-controls="room-sound-settings"
                  onClick={() => setSoundSettingsOpen((open) => !open)}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-white/15 bg-sidebar/55 text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
                >
                  {ambientVolume === 0 ? <VolumeX aria-hidden="true" className="size-4" /> : <SlidersHorizontal aria-hidden="true" className="size-4 text-sidebar-primary" />}
                </button>
                {soundSettingsOpen && (
                  <div id="room-sound-settings" role="group" aria-label={roomText.soundSettings} className="absolute bottom-full start-0 mb-2 w-56 rounded-xl border border-white/15 bg-sidebar/95 p-3 shadow-2xl backdrop-blur-xl">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label htmlFor="ambient-volume" className="text-xs font-medium">{roomText.ambientVolume}</label>
                      <span className="text-xs tabular-nums text-sidebar-muted"><bdi dir="ltr">{ambientVolume}%</bdi></span>
                    </div>
                    <input id="ambient-volume" type="range" min="0" max="70" value={ambientVolume} onChange={handleVolumeChange} className="h-2 w-full cursor-pointer accent-sidebar-primary" />
                  </div>
                )}
              </div>
              <label className="sr-only" htmlFor="audience-difficulty">{roomText.difficultyLabel}</label>
              <select id="audience-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.currentTarget.value as AudienceDifficulty)} aria-describedby="audience-difficulty-hint" className="max-w-28 rounded-lg border border-white/15 bg-sidebar-accent px-2 py-2 text-xs text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-sidebar-ring sm:max-w-36 sm:px-3">
                <option value="relaxed">{roomText.difficultyOptions[0]}</option>
                <option value="engaged">{roomText.difficultyOptions[1]}</option>
                <option value="challenging">{roomText.difficultyOptions[2]}</option>
              </select>
              <span id="audience-difficulty-hint" className="sr-only">{roomText.difficultyHint}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1">
              <RoomIconButton label={cameraStream ? roomText.disableCamera : roomText.enableCamera} onClick={toggleCamera} active={Boolean(cameraStream)}>
                {cameraStream ? <Camera aria-hidden="true" className="size-4" /> : <CameraOff aria-hidden="true" className="size-4" />}
              </RoomIconButton>
              <RoomIconButton label={microphoneStream ? roomText.disableMicrophone : roomText.enableMicrophone} onClick={toggleMicrophone} active={Boolean(microphoneStream)}>
                {microphoneStream ? <Mic aria-hidden="true" className="size-4" /> : <MicOff aria-hidden="true" className="size-4" />}
              </RoomIconButton>
              {cameraStream && (
                <RoomIconButton label={showWebcam ? roomText.hideWebcam : roomText.showWebcam} onClick={() => setShowWebcam((visible) => !visible)} active={showWebcam}>
                  {showWebcam ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                </RoomIconButton>
              )}
              <button type="button" aria-label={slidesVisible ? roomText.hideSlides : roomText.showSlides} title={slidesVisible ? roomText.hideSlides : roomText.showSlides} aria-expanded={slidesVisible} onClick={() => setSlidesVisible((visible) => !visible)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring ${slidesVisible ? 'border-sidebar-primary/60 bg-sidebar-accent text-sidebar-primary' : 'border-white/15 bg-sidebar/60 text-sidebar-foreground hover:bg-sidebar-accent'}`}>
                <FileText aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">{slidesVisible ? roomText.hideSlides : roomText.showSlides}</span>
              </button>
              <RoomIconButton label={phase === 'paused' ? roomText.resume : roomText.pause} onClick={() => setPhase((current) => current === 'paused' ? 'running' : 'paused')}>
                {phase === 'paused' ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}
              </RoomIconButton>
              <RoomIconButton label={isFullscreen ? roomText.exitFullscreen : roomText.fullscreen} onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize2 aria-hidden="true" className="size-4" /> : <Maximize2 aria-hidden="true" className="size-4" />}
              </RoomIconButton>
              <button type="button" onClick={finishSession} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-sidebar-primary px-2.5 text-xs font-semibold text-sidebar-primary-foreground transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring sm:px-3">
                {roomText.endSession}
              </button>
            </div>
          </div>
        </footer>
      )}
    </main>
  )
}

function RoomIconButton({ label, onClick, active = false, children }: {
  label: string
  onClick: () => void
  active?: boolean
  children: ReactNode
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={`inline-flex size-9 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring ${active ? 'border-sidebar-primary/60 bg-sidebar-accent text-sidebar-primary' : 'border-white/15 bg-sidebar/60 text-sidebar-foreground hover:bg-sidebar-accent'}`}>
      {children}
    </button>
  )
}

function SlidesPanel({ file, url, text, collapsed, width, onFileChange, onWidthChange, onToggleCollapse, onClose }: {
  file: File | null
  url: string | null
  text: DashboardCopy['presentationRoom']
  collapsed: boolean
  width: number
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onWidthChange: (width: number) => void
  onToggleCollapse: () => void
  onClose: () => void
}) {
  return (
    <aside aria-labelledby="presentation-slides-title" style={{ width: `min(${width}px, calc(100vw - 1.5rem))` }} className="absolute end-3 top-3 z-20 overflow-hidden rounded-2xl border border-white/25 bg-sidebar/90 shadow-2xl backdrop-blur-xl sm:end-6 sm:top-5">
      <div className="flex min-h-11 items-center gap-2 border-b border-white/10 px-2.5">
        <FileText aria-hidden="true" className="size-4 shrink-0 text-sidebar-primary" />
        <h2 id="presentation-slides-title" className="min-w-0 flex-1 truncate text-xs font-semibold">{text.slidesTitle}</h2>
        <label htmlFor="presentation-slides-width" className="sr-only">{text.resizeSlides}</label>
        <input id="presentation-slides-width" type="range" min="260" max="520" step="10" value={width} onChange={(event) => onWidthChange(Number(event.currentTarget.value))} className="w-14 cursor-ew-resize accent-sidebar-primary sm:w-20" />
        <button type="button" aria-label={collapsed ? text.expandSlides : text.collapseSlides} aria-expanded={!collapsed} onClick={onToggleCollapse} className="grid size-7 shrink-0 place-items-center rounded-lg text-sidebar-muted hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-sidebar-ring">
          {collapsed ? <ChevronDown aria-hidden="true" className="size-4" /> : <ChevronUp aria-hidden="true" className="size-4" />}
        </button>
        <button type="button" aria-label={text.hideSlides} onClick={onClose} className="grid size-7 shrink-0 place-items-center rounded-lg text-sidebar-muted hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-sidebar-ring">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      {!collapsed && (
        <div className="aspect-video bg-black/30">
          {file && url && file.type === 'application/pdf' ? (
            <iframe title={`${text.slidesTitle}: ${file.name}`} src={`${url}#toolbar=1&navpanes=0`} className="size-full bg-white" />
          ) : file && url ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
              <FileText aria-hidden="true" className="size-6 text-sidebar-primary" />
              <p className="max-w-full truncate text-xs" dir="auto">{file.name}</p>
              <a href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-sidebar-primary underline underline-offset-4">{text.openFile}</a>
              <p className="text-[10px] leading-relaxed text-sidebar-muted">{text.slidesUnsupported}</p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
              <FileText aria-hidden="true" className="size-6 text-sidebar-muted" />
              <p className="text-xs leading-relaxed text-sidebar-muted">{text.slidesEmpty}</p>
              <label htmlFor="presentation-slides-running" className="cursor-pointer rounded-lg border border-white/15 bg-sidebar-accent px-3 py-1.5 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar">
                {text.addSlides}
                <input id="presentation-slides-running" type="file" accept={acceptedSlideTypes} onChange={onFileChange} className="sr-only" />
              </label>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

function WebcamPanel({ videoRef, text }: {
  videoRef: RefObject<HTMLVideoElement | null>
  text: DashboardCopy['presentationRoom']
}) {
  return (
    <figure className="absolute bottom-4 start-3 w-32 overflow-hidden rounded-2xl border border-white/25 bg-sidebar/90 shadow-xl sm:bottom-6 sm:start-7 sm:w-48">
      <video ref={videoRef} autoPlay playsInline muted aria-label={text.webcamTitle} className="aspect-video w-full bg-black object-cover" />
      <figcaption className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-sidebar-muted sm:text-xs">
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
        {text.webcamTitle}
      </figcaption>
    </figure>
  )
}
