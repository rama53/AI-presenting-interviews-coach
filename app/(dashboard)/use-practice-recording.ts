import { useCallback, useEffect, useRef, useState } from 'react'

const recordingLimit = 24_000_000

export function usePracticeRecording() {
  const [state, setState] = useState<'idle' | 'starting' | 'recording' | 'stopping' | 'ready' | 'error'>('idle')
  const [file, setFile] = useState<Blob>()
  const current = useRef<MediaRecorder | null>(null)
  const release = useRef<() => void>(() => {})
  const generation = useRef(0)

  useEffect(() => () => {
    generation.current++
    if (current.current) current.current.onstop = null
    release.current()
  }, [])

  const stop = useCallback(() => {
    generation.current++
    const recorder = current.current
    if (recorder?.state === 'recording') {
      setState('stopping')
      recorder.stop()
    }
    release.current()
  }, [])

  function reset() {
    stop()
    setFile(undefined)
    setState('idle')
  }

  async function start() {
    if (state !== 'idle' && state !== 'error') return
    const attempt = ++generation.current
    setState('starting')
    let tab: MediaStream | undefined
    let mic: MediaStream | undefined
    let mixer: AudioContext | undefined
    function cleanup() {
      for (const stream of [tab, mic]) stream?.getTracks().forEach(track => track.stop())
      if (mixer && mixer.state !== 'closed') void mixer.close().catch(() => {})
    }
    release.current = cleanup
    try {
      tab = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: true })
      if (attempt !== generation.current) return cleanup()
      const [video] = tab.getVideoTracks()
      if (!video || (video.getSettings().displaySurface && video.getSettings().displaySurface !== 'browser')) throw new Error('tab')
      mic = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (attempt !== generation.current) return cleanup()
      mixer = new AudioContext()
      const mix = mixer.createMediaStreamDestination()
      for (const source of [tab, mic]) {
        if (source.getAudioTracks().length) mixer.createMediaStreamSource(source).connect(mix)
      }
      await mixer.resume()
      if (attempt !== generation.current) return cleanup()
      const stream = new MediaStream([video, ...mix.stream.getAudioTracks()])
      const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type))
      if (!mimeType) throw new Error('unsupported')
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 450000, audioBitsPerSecond: 64000 })
      const chunks: Blob[] = []
      let bytes = 0
      recorder.ondataavailable = ({ data }) => {
        if (!data.size) return
        if (bytes + data.size <= recordingLimit) {
          chunks.push(data)
          bytes += data.size
        }
        if (bytes >= recordingLimit - 1_000_000 || data.size > recordingLimit - bytes) stop()
      }
      recorder.onstop = () => {
        cleanup()
        current.current = null
        if (bytes) {
          setFile(new Blob(chunks, { type: recorder.mimeType }))
          setState('ready')
        } else {
          setState('error')
        }
      }
      recorder.onerror = () => {
        recorder.onstop = null
        cleanup()
        current.current = null
        setState('error')
      }
      video.addEventListener('ended', stop, { once: true })
      recorder.start(1000)
      current.current = recorder
      setState('recording')
    } catch {
      cleanup()
      if (attempt === generation.current) setState('error')
    }
  }

  return { state, file, start, stop, reset }
}
