export function SelfReview({ title, questions }: { title: string; questions: readonly string[] }) {
  return (
    <div className="text-sm leading-relaxed text-muted-foreground">
      <p className="font-semibold text-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-1 ps-5">
        {questions.map((question) => <li key={question}>{question}</li>)}
      </ul>
    </div>
  )
}
