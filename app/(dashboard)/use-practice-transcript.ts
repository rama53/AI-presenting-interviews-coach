'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Language } from './copy'

type RecognitionEvent = {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

type Recognition = {
  lang: string
  continuous: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition
  webkitSpeechRecognition?: new () => Recognition
}

export function usePracticeTranscript(language: Language) {
  const [transcript, setTranscript] = useState('')
  const [status, setStatus] = useState<'idle' | 'listening' | 'stopping' | 'unavailable' | 'error'>('idle')
  const microphone = useRef<Recognition | null>(null)
  const stopping = useRef(false)
  const busy = status === 'listening' || status === 'stopping'

  useEffect(() => () => {
    const active = microphone.current
    microphone.current = null
    active?.abort()
  }, [])

  function startMicrophone() {
    if (microphone.current) return
    const browser = window as SpeechWindow
    const SpeechRecognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setStatus('unavailable')
      return
    }

    const recognition = new SpeechRecognition()
    stopping.current = false
    microphone.current = recognition
    recognition.continuous = true
    recognition.lang = language === 'ar' ? 'ar-PS' : 'en-US'
    recognition.onresult = (event) => {
      if (microphone.current !== recognition) return
      const spoken = Array.from(event.results).slice(event.resultIndex).map((entry) => entry[0].transcript).join(' ').trim()
      if (!spoken) return
      setTranscript((previous) => [previous.trim(), spoken].filter(Boolean).join(' '))
    }
    recognition.onerror = () => {
      if (microphone.current === recognition) setStatus('error')
    }
    recognition.onend = () => {
      if (microphone.current !== recognition) return
      microphone.current = null
      setStatus((previous) => previous === 'error' ? previous : 'idle')
    }
    try {
      recognition.start()
      setStatus('listening')
    } catch {
      microphone.current = null
      setStatus('error')
    }
  }

  const stopMicrophone = useCallback(() => {
    if (!microphone.current || stopping.current) return
    stopping.current = true
    setStatus('stopping')
    microphone.current.stop()
  }, [])

  return { transcript, setTranscript, status, busy, startMicrophone, stopMicrophone }
}
