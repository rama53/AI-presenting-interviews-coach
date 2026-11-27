type Language = 'ar' | 'en'

const stopWords = new Set('about after also and are been can each for from have into more our that the their then these this those through was were what when which will with would أنت الى إلى ايضا تحت خلال ذلك سوف عند غير فقد فوق كان كما كيف لنا ليس ماذا مثل هذه هذا هنا هناك وهي وهو ومن على الذي التي العرض المقدمة الشريحة'.split(' '))

function terms(text: string) {
  const normalized = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  return [...new Set((normalized.match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((word) => word.length >= 3 && !stopWords.has(word) && !/^\p{N}+$/u.test(word)))]
}

export function presentationCoverage(transcript: string, slides: string[]) {
  const spoken = new Set(terms(transcript))
  return slides.flatMap((slide, index) => {
    const keywords = terms(slide)
    if (!keywords.length) return []
    const phrase = slide.trim().replace(/\s+/g, ' ').slice(0, 95).trim()
    const matches = keywords.filter((word) => spoken.has(word)).length
    return [{ index: index + 1, phrase, covered: matches >= Math.min(2, keywords.length), matches }]
  })
}

export function questionFromSlides(transcript: string, slides: string[], language: Language) {
  const [slide] = presentationCoverage(transcript, slides).sort((a, b) => a.matches - b.matches)
  if (!slide) return null
  const text = language === 'ar'
    ? `في الشريحة رقم ${slide.index} ورد «${slide.phrase}». ممكن توضح أهم نقطة فيه بمثال؟`
    : `Slide ${slide.index} mentions “${slide.phrase}.” Could you illustrate the main point with an example?`
  return { text, audio: null }
}

export type VoiceSamples = { voiced: number; pitch: number[] }

export function sampleVoice(samples: VoiceSamples, frame: Float32Array, sampleRate: number) {
  // Decimate to keep the correlation small while preserving the speech pitch range.
  const stride = Math.max(1, Math.floor(sampleRate / 6000))
  let energy = 0
  for (let i = 0; i < frame.length; i += stride) energy += frame[i] ** 2
  if (Math.sqrt(energy / Math.ceil(frame.length / stride)) < 0.015) return
  samples.voiced++

  const rate = sampleRate / stride
  const minLag = Math.floor(rate / 400)
  const maxLag = Math.ceil(rate / 75)
  let previous = 0
  let peak = 0
  let period = 0
  for (let lag = minLag; lag <= maxLag; lag++) {
    let product = 0, left = 0, right = 0
    const offset = lag * stride
    for (let i = 0; i + offset < frame.length; i += stride) {
      const a = frame[i], b = frame[i + offset]
      product += a * b
      left += a * a
      right += b * b
    }
    const correlation = left && right ? product / Math.sqrt(left * right) : 0
    if (previous > 0.75 && correlation < previous && previous === peak) {
      samples.pitch.push(rate / period)
      return
    }
    if (correlation > peak) {
      peak = correlation
      period = lag
    }
    previous = correlation
  }
}

export function summarizePitch(samples: VoiceSamples) {
  if (samples.pitch.length < 12) return null
  const sorted = [...samples.pitch].sort((a, b) => a - b)
  const low = sorted[Math.floor(sorted.length * 0.1)]
  const high = sorted[Math.floor(sorted.length * 0.9)]
  return 12 * Math.log2(high / low)
}
