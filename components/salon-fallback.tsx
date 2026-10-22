import { Scissors } from "lucide-react"

export function SalonFallback({ name, place }: { name: string; place?: string }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden bg-secondary px-4 text-center">
      <div aria-hidden="true" className="pointer-events-none absolute -top-10 -right-8 size-36 rounded-full bg-primary/15" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-10 size-32 rounded-full bg-primary/10" />
      <Scissors className="relative size-8 text-primary" aria-hidden="true" />
      <p className="relative font-heading text-2xl leading-tight text-balance">{name}</p>
      {place ? <p className="relative text-sm text-muted-foreground">{place}</p> : null}
    </div>
  )
}
