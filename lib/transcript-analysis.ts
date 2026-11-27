export type AnalysisMode = 'personal' | 'technical' | 'presentation'
type Language = 'ar' | 'en'
type Input = { transcript: string; language: Language; mode: AnalysisMode }

export function analyzeTranscript({ transcript, language, mode }: Input) {
  const words = transcript.match(/[\p{L}\p{N}]+/gu) ?? []
  if (!words.length) return null

  const arabic = language === 'ar'
  const hasNumber = /\p{N}/u.test(transcript)
  const questions = {
    personal: arabic
      ? ['شو كان دورك تحديدًا، وكيف قست نتيجة شغلك؟', 'شو القرار اللي أخذته بنفسك، وشو تعلمت منه؟']
      : ['What was your specific role, and how did you measure the outcome?', 'Which decision did you make yourself, and what did you learn from it?'],
    technical: arabic
      ? ['كيف بتتحقق إن الحل نجح، ومتى ممكن يفشل؟', 'ليش اخترت هالحل، وشو البديل اللي قارنت معه؟']
      : ['How would you verify that the solution works, and when might it fail?', 'Why did you choose this solution, and what alternative did you compare it with?'],
    presentation: arabic
      ? ['شو مثال أو دليل بيدعم فكرتك الرئيسية؟', 'شو الخطوة اللي بدك الجمهور يعملها بعد العرض؟']
      : ['What example or evidence supports your main point?', 'What action should the audience take after the presentation?'],
  }

  const evidence = hasNumber
    ? (arabic ? 'ذكرت رقمًا. وضّح شو بقيس وكيف بيدعم فكرتك.' : 'You included a number. Explain what it measures and how it supports your point.')
    : (arabic ? 'جرّب تضيف مثالًا محددًا أو نتيجة قابلة للقياس إذا كانت مناسبة.' : 'Try adding a concrete example or a measurable result where appropriate.')
  const detail = words.length < 20
    ? (arabic ? 'وسّع الفكرة بجملة تشرح السبب أو النتيجة.' : 'Add a sentence explaining the reasoning or outcome.')
    : (arabic ? 'راجع إذا أول جملة بتوضح الفكرة الرئيسية مباشرة.' : 'Check whether your opening sentence immediately states the main point.')

  return { wordCount: words.length, followUp: questions[mode][Number(hasNumber)], notes: [evidence, detail] }
}
