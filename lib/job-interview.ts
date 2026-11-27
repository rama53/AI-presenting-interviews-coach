type Language = 'ar' | 'en'
type Mode = 'personal' | 'technical'
type Requirement = {
  cue: RegExp
  label: Record<Language, string>
  question: Record<Language, string>
}

const requirements: Requirement[] = [
  {
    cue: /\b(?:rest(?:ful)?|apis?)\b|واجهات برمجية/iu,
    label: { ar: 'واجهات API', en: 'APIs' },
    question: { ar: 'كيف تختبري واجهة API قبل النشر، وشو الرد المتوقع على طلب ناقص؟', en: 'How would you test an API before release, and what response would you expect for an incomplete request?' },
  },
  {
    cue: /\b(?:postgresql|postgres|sql|mysql|databases?)\b|قواعد البيانات|قاعدة البيانات/iu,
    label: { ar: 'قواعد البيانات', en: 'databases' },
    question: { ar: 'لو صار استعلام قاعدة البيانات بطيئًا، كيف بتحددي السبب وتختبري إن الحل حسّن الأداء؟', en: 'How would you diagnose a slow database query and verify that your fix improved performance?' },
  },
  {
    cue: /\b(?:react(?:\.js)?|next\.js|frontend|front-end)\b|واجهات المستخدم/iu,
    label: { ar: 'تطوير واجهات المستخدم', en: 'frontend development' },
    question: { ar: 'كيف بتصممي واجهة تعرض حالات التحميل والخطأ والنجاح عند طلب البيانات؟', en: 'How would you design a frontend that handles loading, error, and success states when fetching data?' },
  },
  {
    cue: /\b(?:python|fastapi|django)\b|بايثون/iu,
    label: { ar: 'Python', en: 'Python' },
    question: { ar: 'كيف بتتعاملِ مع خطأ غير متوقع بخدمة Python، وكيف بتتأكدي إنه مسجّل وبيسهل تتبّعه؟', en: 'How would you handle an unexpected error in a Python service and make it easy to trace?' },
  },
  {
    cue: /\b(?:testing|tests?|qa|jest|pytest)\b|اختبار|اختبارات/iu,
    label: { ar: 'اختبار البرمجيات', en: 'software testing' },
    question: { ar: 'اختاري ميزة واكتبي لها ثلاث حالات اختبار: الحالة العادية، حالة حدّية، وحالة فشل. شو النتيجة المتوقعة لكل واحدة؟', en: 'Pick a feature and describe a normal, an edge, and a failure test. What result do you expect from each?' },
  },
  {
    cue: /\b(?:docker|kubernetes|ci\/cd|devops)\b|دوكر/iu,
    label: { ar: 'النشر وتشغيل الخدمات', en: 'deployment and operations' },
    question: { ar: 'لو التحديث الجديد سبب أخطاء بعد النشر، كيف بتكتشفي المشكلة وبترجعي لنسخة شغّالة؟', en: 'If a release started causing errors, how would you detect the problem and roll back safely?' },
  },
  {
    cue: /\b(?:excel|analytics|data analysis|power bi)\b|تحليل البيانات|اكسل|إكسل/iu,
    label: { ar: 'تحليل البيانات', en: 'data analysis' },
    question: { ar: 'لو استلمتي جدول فيه بيانات ناقصة ومكررة، كيف بتنظفيه وبتتحققي من النتيجة قبل عرضها؟', en: 'How would you clean a dataset with missing and duplicate values and verify it before presenting your findings?' },
  },
  {
    cue: /\b(?:customer service|customer support|client communication|sales)\b|خدمة العملاء|المبيعات|دعم العملاء/iu,
    label: { ar: 'التعامل مع العملاء', en: 'working with customers' },
    question: { ar: 'كيف بتحددي سبب مشكلة عميل وصفها بشكل غير واضح، وكيف بتتأكدي إن الحل نفع معه؟', en: 'How would you diagnose a customer issue described vaguely and confirm that the solution worked?' },
  },
  {
    cue: /\b(?:teamwork|collaboration|cross-functional)\b|عمل جماعي|العمل الجماعي|العمل ضمن فريق/iu,
    label: { ar: 'العمل ضمن فريق', en: 'teamwork' },
    question: { ar: 'كيف بتنسقي تسليم مهمة مشتركة بين أكثر من فريق وبتتأكدي إن المسؤوليات واضحة؟', en: 'How would you coordinate a handoff across teams and make sure responsibilities are clear?' },
  },
]

export function questionsFromJobDescription(description: string, language: Language, mode: Mode) {
  return requirements
    .flatMap((requirement) => {
      const match = description.match(requirement.cue)
      return match ? [{ requirement, position: match.index ?? 0 }] : []
    })
    .sort((a, b) => a.position - b.position)
    .slice(0, 4)
    .map(({ requirement }) => {
      if (mode === 'technical') return requirement.question[language]
      const skill = requirement.label[language]
      return language === 'ar'
        ? `احكي عن موقف استخدمتي فيه مهارة «${skill}». شو كان دورك وشو النتيجة؟`
        : `Tell me about a time you used ${skill}. What was your role and what was the outcome?`
    })
}
