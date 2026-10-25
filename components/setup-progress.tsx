import { SETUP_STEPS, type SetupStep } from "@/lib/suggested-services"

export function SetupProgress({ step, signedIn = false }: { step: SetupStep; signedIn?: boolean }) {
  const steps = signedIn ? SETUP_STEPS.filter((item) => item.id !== "account") : [...SETUP_STEPS]
  const index = Math.max(0, steps.findIndex((item) => item.id === step))
  const current = steps[index]
  const width = Math.round(((index + 1) / steps.length) * 100)
  const sentence = `Step ${index + 1} of ${steps.length}: ${current?.label ?? ""}`
  return (
    <div>
      <p className="sr-only">{sentence}</p>
      <p aria-hidden="true" className="text-sm font-medium">
        Step {index + 1} of {steps.length}
        <span className="text-muted-foreground"> · {current?.label}</span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <ol className="mt-3 flex justify-between text-xs text-muted-foreground max-[400px]:hidden">
        {steps.map((item, itemIndex) => (
          <li
            key={item.id}
            aria-current={item.id === step ? "step" : undefined}
            className={itemIndex <= index ? "font-medium text-foreground" : undefined}
          >
            {item.label}
          </li>
        ))}
      </ol>
    </div>
  )
}
