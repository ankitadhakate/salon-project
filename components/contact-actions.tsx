import { directionsHref, formatPhone, whatsAppHref } from "@/lib/format"
import { siteName } from "@/lib/site"
import { TrackedLink } from "@/components/tracked-link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ContactActions({
  name,
  phone,
  whatsapp,
  address,
  demo = false,
  layout = "stack",
  place = "",
  dialCode = "91",
  salonId = "",
  latitude = null,
  longitude = null,
}: {
  name: string
  phone: string
  whatsapp: string
  address: string
  demo?: boolean
  layout?: "stack" | "bar"
  place?: string
  dialCode?: string
  salonId?: string
  latitude?: number | null
  longitude?: number | null
}) {
  if (demo) {
    const note = "Sample listing. WhatsApp and call are switched off so this demo never messages a real number."
    if (layout === "bar") {
      return (
        <div>
          <div className="flex gap-2">
            <span className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-whatsapp px-4 text-base font-medium text-white opacity-60">
              WhatsApp
            </span>
            <span className={cn(buttonVariants({ variant: "outline" }), "h-12 px-4 text-base opacity-60")}>
              Call
            </span>
          </div>
          <p className="mt-1 text-center text-xs text-muted-foreground">{note}</p>
        </div>
      )
    }
    return <p className="rounded-xl bg-secondary px-3 py-3 text-sm">{note}</p>
  }
  const callHref = `tel:+${dialCode}${phone}`
  if (layout === "bar") {
    return (
      <div className="flex gap-2">
        {whatsapp ? (
          <TrackedLink
            salonId={salonId}
            kind="whatsapps"
            href={whatsAppHref(whatsapp, name, siteName(), dialCode)}
            external
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-whatsapp px-4 text-base font-medium text-white"
          >
            WhatsApp
          </TrackedLink>
        ) : null}
        {phone ? (
          <TrackedLink
            salonId={salonId}
            kind="calls"
            href={callHref}
            className={cn(buttonVariants({ variant: "outline" }), "h-12 flex-1 px-4 text-base")}
          >
            Call
          </TrackedLink>
        ) : null}
      </div>
    )
  }
  return (
    <div className="grid gap-2">
      {whatsapp ? (
        <TrackedLink
          salonId={salonId}
          kind="whatsapps"
          href={whatsAppHref(whatsapp, name, siteName(), dialCode)}
          external
          className="inline-flex h-12 items-center justify-center rounded-xl bg-whatsapp px-4 text-base font-medium text-white"
        >
          WhatsApp {formatPhone(whatsapp, dialCode)}
        </TrackedLink>
      ) : null}
      {phone ? (
        <TrackedLink
          salonId={salonId}
          kind="calls"
          href={callHref}
          className={cn(buttonVariants({ variant: "outline" }), "h-12 text-base")}
        >
          Call {formatPhone(phone, dialCode)}
        </TrackedLink>
      ) : null}
      <TrackedLink
        salonId={salonId}
        kind="directions"
        href={directionsHref(latitude, longitude, address, place)}
        external
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Directions
      </TrackedLink>
    </div>
  )
}
