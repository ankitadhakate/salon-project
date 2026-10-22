import { formatPhone, mapsHref, whatsAppHref } from "@/lib/format"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ContactActions({
  name,
  phone,
  whatsapp,
  address,
  demo = false,
  layout = "stack",
}: {
  name: string
  phone: string
  whatsapp: string
  address: string
  demo?: boolean
  layout?: "stack" | "bar"
}) {
  if (demo) {
    return (
      <p className="rounded-xl bg-secondary px-3 py-3 text-sm">
        Sample listing. WhatsApp and call are switched off so this demo never messages a real number.
      </p>
    )
  }
  if (layout === "bar") {
    return (
      <div className="flex gap-2">
        {whatsapp ? (
          <a
            href={whatsAppHref(whatsapp, name)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-whatsapp px-4 text-base font-medium text-white"
          >
            WhatsApp
          </a>
        ) : null}
        {phone ? (
          <a
            href={`tel:+91${phone}`}
            className={cn(buttonVariants({ variant: "outline" }), "h-12 px-4 text-base")}
          >
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
          href={whatsAppHref(whatsapp, name)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-whatsapp px-4 text-base font-medium text-white"
        >
          WhatsApp {formatPhone(whatsapp)}
        </a>
      ) : null}
      {phone ? (
        <a
          href={`tel:+91${phone}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-12 text-base")}
        >
          Call {formatPhone(phone)}
        </a>
      ) : null}
      <a
        href={mapsHref(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Directions
      </a>
    </div>
  )
}
