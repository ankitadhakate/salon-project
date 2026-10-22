import { Badge } from "@/components/ui/badge"

export function EarlyPartnerBadge() {
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-gold px-2.5 text-[11px] font-semibold tracking-wide text-gold-ink uppercase">
      Early partner
    </span>
  )
}

export function SampleBadge() {
  return (
    <Badge variant="outline" className="h-6 bg-card/90 px-2 text-[11px] uppercase tracking-wide">
      Sample
    </Badge>
  )
}
