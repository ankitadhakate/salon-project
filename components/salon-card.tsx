import Link from "next/link"
import { MapPin, Navigation } from "lucide-react"
import { EarlyPartnerBadge, SampleBadge } from "@/components/badges"
import { SalonFallback } from "@/components/salon-fallback"
import { SaveHeart } from "@/components/save-heart"
import { formatDistance } from "@/lib/geo"
import { genderLabel, inr, isOpenNow } from "@/lib/format"
import type { SalonCard as SalonCardData } from "@/lib/salons"
import { cn } from "@/lib/utils"

function fromPrice(prices: number[], starting: number | null) {
  const values = prices.filter((price) => price > 0)
  const low = values.length > 0 ? Math.min(...values) : starting
  if (low == null || low <= 0) return null
  return { label: `from ${inr(low)}`, amount: low }
}

export function SalonCard({
  salon,
  className,
  distanceKm = null,
  layout = "grid",
}: {
  salon: SalonCardData
  className?: string
  distanceKm?: number | null
  layout?: "grid" | "rail"
}) {
  const photo = salon.photos[0]
  const href = `/${salon.citySlug}/${salon.areaSlug}/${salon.slug}`
  const area = salon.locality?.name || salon.areaSlug
  const place = [salon.locality?.name, salon.city?.name].filter(Boolean).join(", ")
  const open = salon.hours.length
    ? isOpenNow(salon.hours, salon.city?.timezone || "Asia/Kolkata")
    : null
  const price = fromPrice(
    salon.services.map((service) => service.priceInr),
    salon.startingPrice,
  )
  return (
    <li className={cn(layout === "rail" ? "w-[78vw] max-w-[300px] shrink-0 snap-start" : "min-w-0", className)}>
      <article className="card-lift group relative h-full overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5">
        <Link href={href} className="flex h-full flex-col">
          <div className="relative aspect-[4/3] overflow-hidden bg-blush-soft">
            {photo ? (
              // Owner uploads and sample SVGs. next/image does not allow SVG.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.url}
                alt={photo.alt || `${salon.name} in ${place || "the city"}`}
                width={640}
                height={480}
                className="img-zoom h-full w-full object-cover"
              />
            ) : (
              <SalonFallback name={salon.name} place={place} />
            )}
            {price ? (
              <span className="absolute bottom-3 left-3 rounded-full bg-mustard px-2.5 py-1 text-xs font-bold text-ink">
                {price.label}
              </span>
            ) : null}
            {salon.isDemo ? (
              <span className="absolute top-3 left-3">
                <SampleBadge />
              </span>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <h3 className="font-heading text-xl leading-tight tracking-tight">{salon.name}</h3>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {area}
              </span>
              {distanceKm != null ? (
                <span className="inline-flex items-center gap-1">
                  <Navigation className="size-3.5 shrink-0" aria-hidden />
                  {formatDistance(distanceKm)}
                </span>
              ) : null}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {open === true ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-sage-ink">
                  <span className="size-2 rounded-full bg-sage" aria-hidden />
                  Open now
                </span>
              ) : open === false ? (
                <span className="text-muted-foreground">Closed</span>
              ) : null}
              <span className="text-muted-foreground">{genderLabel(salon.gender)}</span>
            </p>
            {salon.isEarlyPartner ? (
              <div className="mt-auto pt-1">
                <EarlyPartnerBadge />
              </div>
            ) : null}
          </div>
        </Link>
        <SaveHeart salonId={salon.id} />
      </article>
    </li>
  )
}
