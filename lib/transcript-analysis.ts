export type AnalysisMode = 'personal' | 'technical' | 'presentation'
type Language = 'ar' | 'en'
type Input = { transcript: string; language: Language; mode: AnalysisMode; presentationTopic?: string }
type Feedback = readonly [question: string, note: string, retry: string]
type Rule = { cue: RegExp; ar: Feedback; en: Feedback }

const rules = {
  presentation: [
    {
      cue: /(?:وهو عن|وهي عن|والموضوع هو|(?:واللي|اللي|يلي|والذي|الذي)\s+(?:هو|هي)\s+(?:عبار[ةه]\s+)?عن|عن موضوع[^\n.!؟?]{0,60}\s+وه[وي](?:\s+عن)?|(?:the topic is|it['’]s about))\s+[^.!?؟\n]+/iu,
      ar: ['شو النقطة المحددة اللي بدك الجمهور يتذكّرها عن هالموضوع؟', 'ذكرتِ الموضوع. حدّدي أي جانب رح تركّزي عليه، وأعطي مثال يوضّحه.', 'اليوم رح أحكي عن [جانب محدد من الموضوع]، وبوضّحه بمثال عن [المثال].'],
      en: ['What specific point about this topic should your audience remember?', 'You named the topic. Narrow it to one point and illustrate it with an example.', 'Today I’ll focus on [specific point] and illustrate it with [example].'],
    },
    {
      cue: /عن موضوع (?:كتير |كثير |جدا )?(?:حلو|مهم|ممتع|شيق)|about (?:a|an) (?:very )?(?:interesting|important|great) topic/iu,
      ar: ['شو الفكرة اللي بدك الجمهور يتذكّرها؟', 'سمّي موضوع العرض ووضّحي شو رح يستفيد الجمهور.', 'اليوم رح أحكي عن [الموضوع]، وبنهاية العرض رح تعرفوا [الفائدة].'],
      en: ['What idea should the audience remember?', 'Name your topic and explain what the audience will gain.', 'Today I’ll talk about [topic]. By the end, you’ll know [takeaway].'],
    },
  ],
  personal: [
    {
      cue: /فحص (?:لل)?مدخلات|تحقق من المدخلات|input validation|validat(?:ed|ing) (?:the )?inputs?/iu,
      ar: ['كيف اختبرتِ إن فحص المدخلات بيرفض الطلب الناقص وبسمح للطلب الصحيح؟', 'ذكرتِ إجراءً محددًا. أضيفي كيف تحققتِ منه وشو كانت النتيجة.', 'أضفت فحصًا للمدخلات، واختبرته باستخدام [حالتين]، وكانت النتيجة [النتيجة].'],
      en: ['How did you test that input validation rejects incomplete requests and accepts valid ones?', 'You named a specific action. Add how you verified it and what happened.', 'I added input validation, tested [two cases], and observed [result].'],
    },
    {
      cue: /اشتغلنا|عملنا|الفريق|we worked|we built|our team/iu,
      ar: ['شو كان دورك الشخصي، وكيف ساهم بالنتيجة؟', 'وضّحي الإجراء اللي أخذتي مسؤوليته ضمن شغل الفريق.', 'اشتغلنا على [المهمة]. دوري كان [الإجراء]، وكانت النتيجة [النتيجة].'],
      en: ['What did you personally own, and how did it affect the outcome?', 'Clarify which action you owned within the team.', 'We worked on [task]. I owned [action], which led to [result].'],
    },
  ],
  technical: [
    {
      cue: /قاعدة البيانات|استعلام|database|\bquery\b|\bsql\b/iu,
      ar: ['كيف بتختبري إن حل قاعدة البيانات بشتغل مع حجم بيانات أكبر؟', 'وضّحي طريقة قياس أداء الحل والحالة اللي ممكن يفشل فيها.', 'اخترت [الحل] بسبب [السبب]، وقست [المؤشر] عند [حجم بيانات].'],
      en: ['How would you test your database solution with a larger dataset?', 'Explain how you would measure performance and identify a failure case.', 'I chose [solution] because [reason] and measured [metric] at [data volume].'],
    },
    {
      cue: /\bapi\b|طلب ناقص|فحص المدخلات|input validation/iu,
      ar: ['شو الطلب الصحيح والطلب الناقص اللي رح تجرّبيهم، وشو الرد المتوقع لكل واحد؟', 'حدّدي سلوك الـ API المتوقع في حالة نجاح وحالة فشل.', 'بختبر [طلب صحيح] و[طلب ناقص]، وبتأكد من [الرد المتوقع] لكل حالة.'],
      en: ['Which valid and incomplete requests would you test, and what response should each return?', 'Specify expected API behavior for one success and one failure case.', 'I would send [valid request] and [incomplete request], then check [expected response] for each.'],
    },
  ],
} satisfies Record<AnalysisMode, Rule[]>

const fallback = {
  presentation: {
    ar: ['شو مثال أو دليل بيدعم فكرتك الرئيسية؟', 'اربطي الفكرة بمثال واضح، وبيّني علاقته بالموضوع.', 'فكرتي الرئيسية هي [الفكرة]. مثال عليها [المثال]، وهو مهم لأنه [السبب].'],
    en: ['What example or evidence supports your main point?', 'Connect your point to a concrete example and explain the connection.', 'My main point is [idea]. One example is [example], and it matters because [reason].'],
  },
  personal: {
    ar: ['شو عملتِ تحديدًا، وكيف عرفتي إن الإجراء نجح؟', 'اربطي دورك بنتيجة لاحظتيها أو قستيها.', 'واجهت [الموقف]، وعملت [الإجراء]، وعرفت إنه نجح من [النتيجة].'],
    en: ['What did you do, and how did you know it worked?', 'Connect your action to an outcome you observed or measured.', 'I faced [situation], took [action], and knew it worked because [result].'],
  },
  technical: {
    ar: ['ليش اخترتِ هالحل، وكيف بتتحققي إنه بشتغل؟', 'أضيفي سبب اختيار الحل وطريقة اختباره.', 'اخترت [الحل] بسبب [السبب]، وبتأكد منه عن طريق [اختبار].'],
    en: ['Why did you choose this solution, and how would you verify it works?', 'Add your reason for choosing the approach and how you would test it.', 'I chose [solution] because [reason] and would verify it with [test].'],
  },
} satisfies Record<AnalysisMode, Record<Language, Feedback>>

const topicCue = /(?:عن موضوع|رح نحكي عن|رح أحكي عن|today (?:we|i).{0,24} about)\s+(.+)/iu

export function analyzeTranscript({ transcript, language, mode, presentationTopic = '' }: Input) {
  const words = transcript.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu) ?? []
  if (!words.length) return null

  const topicFromText = mode === 'presentation' && presentationSignals(transcript, presentationTopic).topic
  const rule = mode === 'presentation'
    ? rules.presentation[0].cue.test(transcript)
      ? rules.presentation[0]
      : !topicFromText && !presentationTopic && rules.presentation[1].cue.test(transcript) ? rules.presentation[1] : undefined
    : rules[mode].find(({ cue }) => cue.test(transcript))
  const [followUp, note, retry] = (rule ?? fallback[mode])[language]
  const evidence = rule ? transcript.match(rule.cue)?.[0] : mode === 'presentation' ? transcript.match(topicCue)?.[0].slice(0, 96) : undefined
  return { wordCount: words.length, followUp, note, retry, evidence }
}

const exampleCue = /(?:مثلا|مثلًا|على سبيل المثال|كمثال|for example|for instance|such as)\s+[^.!?؟\n]+/iu
const namedTopicCue = /(?:رح نحكي عن|رح أحكي عن|حنحكي عن|حاحكي عن|عرضي عن|عرضنا عن|عرضي اليوم عن|موضوعي اليوم|بدي أحكي عن|خلّينا نحكي عن|presentation is about|present(?:ing)? on|الموضوع هو|وهو عن|وهي عن|عن موضوع[^.!?؟\n]{0,60}\s+وه[وي](?:\s+عن)?|(?:the topic is|it['’]s about|today (?:we|i).{0,24} about))\s+(?!موضوع(?:\s|$)|(?:a|an) (?:very )?(?:interesting|important|great) topic)[^.!?؟\n]+/iu

function normalizeTopic(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function presentationSignals(transcript: string, presentationTopic = '') {
  const topic = normalizeTopic(presentationTopic)
  const mentionsTopic = topic !== '' && ` ${normalizeTopic(transcript)} `.includes(` ${topic} `)
  const explicitTopic = rules.presentation[0].cue.test(transcript)
  const vagueOpening = rules.presentation[1].cue.test(transcript)
  return {
    topic: mentionsTopic || explicitTopic || (!vagueOpening && namedTopicCue.test(transcript)),
    example: exampleCue.test(transcript),
  }
}

export function comparePresentations(first: string, revised: string, language: Language, presentationTopic = '') {
  const before = presentationSignals(first, presentationTopic)
  const now = presentationSignals(revised, presentationTopic)
  const ar = language === 'ar'
  const improved = []
  const remaining = []

  if (now.topic && !before.topic) improved.push(ar ? 'سمّيتي موضوع العرض في المحاولة الجديدة.' : 'You named the topic in the new attempt.')
  if (now.example && !before.example) improved.push(ar ? 'أضفتِ عبارة تقدّم مثالًا.' : 'You added a phrase introducing an example.')
  if (!now.topic) remaining.push(ar ? 'تأكدي إن الفكرة الرئيسية وصلت بوضوح.' : 'Check that the main idea comes across clearly.')
  if (!now.example) remaining.push(ar ? 'قدّمي مثالًا محددًا يدعم فكرتك.' : 'Introduce a specific example that supports your point.')

  return { improved, remaining }
}

const audiencePrompts = {
  ar: [
    { text: 'هل يمكنك تلخيص موضوع العرض في جملة واحدة؟', audio: 'ar-clear-0.mp3' },
    { text: 'كيف يمكننا تطبيق هذه الفكرة في حياتنا اليومية؟', audio: 'ar-clear-1.mp3' },
    { text: 'هل يمكنك إعطاء مثال آخر على هذه الفكرة؟', audio: 'ar-clear-2.mp3' },
  ],
  en: [
    { text: 'How would you sum up your topic for the audience in one sentence?', audio: 'en-0.mp3' },
    { text: 'How could we put your idea into practice in everyday life?', audio: 'en-1.mp3' },
    { text: 'How could we apply your idea in a different situation?', audio: 'en-2.mp3' },
  ],
}

export function buildAudienceQuestion(transcript: string, language: Language, presentationTopic = '') {
  const { topic, example } = presentationSignals(transcript, presentationTopic)
  return audiencePrompts[language][example ? 2 : topic || presentationTopic.trim() ? 1 : 0]
}

export function audienceAnswerTip(answer: string, language: Language) {
  const hasExample = exampleCue.test(answer)
  if (language === 'ar') {
    if (!answer.trim()) return 'انتهى الوقت بدون جواب مكتوب أو مفرّغ.'
    return hasExample ? 'استخدمتِ عبارة تقدّم مثالًا. راجعي إذا المثال بجاوب السؤال مباشرة.' : 'جرّبي تدعمي جوابك بمثال محدد بعد الجملة الأولى.'
  }
  if (!answer.trim()) return 'Time ended without a typed or transcribed answer.'
  return hasExample ? 'You introduced an example. Check that it answers the question directly.' : 'Try adding a concrete example after your opening sentence.'
}

