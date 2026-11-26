export function AssessmentCriteria({ title, criteria }: { title: string; criteria: readonly string[] }) {
  return (
    <div className="text-sm leading-relaxed text-muted-foreground">
      <p className="font-semibold text-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-1 ps-5">
        {criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
      </ul>
    </div>
  )
}
