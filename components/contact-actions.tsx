import { formatPhone, mapsHref, whatsAppHref } from "@/lib/format"
import { siteName } from "@/lib/site"
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
}: {
  name: string
  phone: string
  whatsapp: string
  address: string
  demo?: boolean
  layout?: "stack" | "bar"
  place?: string
  dialCode?: string
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
          <a
            href={whatsAppHref(whatsapp, name, siteName(), dialCode)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-whatsapp px-4 text-base font-medium text-white"
          >
            WhatsApp
          </a>
        ) : null}
        {phone ? (
          <a href={callHref} className={cn(buttonVariants({ variant: "outline" }), "h-12 flex-1 px-4 text-base")}>
            Call
          </a>
        ) : null}
      </div>
    )
  }
  return (
    <div className="grid gap-2">
      {whatsapp ? (
        <a
          href={whatsAppHref(whatsapp, name, siteName(), dialCode)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-whatsapp px-4 text-base font-medium text-white"
        >
          WhatsApp {formatPhone(whatsapp, dialCode)}
        </a>
      ) : null}
      {phone ? (
        <a href={callHref} className={cn(buttonVariants({ variant: "outline" }), "h-12 text-base")}>
          Call {formatPhone(phone, dialCode)}
        </a>
      ) : null}
      <a
        href={mapsHref(address, place)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Directions
      </a>
    </div>
  )
}
