import { Share2 } from "lucide-react"
import { TrackedLink } from "@/components/tracked-link"
import { whatsAppShareHref } from "@/lib/format"

export function WhatsAppShare({ message, salonId = "" }: { message: string; salonId?: string }) {
  return (
    <TrackedLink
      salonId={salonId}
      kind="shares"
      href={whatsAppShareHref(message)}
      external
      className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-medium"
    >
      <Share2 aria-hidden="true" />
      Share
    </TrackedLink>
  )
}
