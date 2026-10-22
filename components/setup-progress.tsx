import { SETUP_STEPS, type SetupStep } from "@/lib/suggested-services"

export function SetupProgress({ step }: { step: SetupStep }) {
  const index = SETUP_STEPS.findIndex((item) => item.id === step)
  const current = index < 0 ? 0 : index
  const width = Math.round(((current + 1) / SETUP_STEPS.length) * 100)
  return (
    <div>
      <p className="text-sm font-medium">
        Step {current + 1} of {SETUP_STEPS.length}
        <span className="text-muted-foreground"> · {SETUP_STEPS[current]?.label}</span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <ol className="mt-3 flex justify-between text-xs text-muted-foreground">
        {SETUP_STEPS.map((item, itemIndex) => (
          <li key={item.id} className={itemIndex <= current ? "font-medium text-foreground" : undefined}>
            {item.label}
          </li>
        ))}
      </ol>
    </div>
  )
}
