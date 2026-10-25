import Link from "next/link"
import { EarlyPartnerBadge, SampleBadge } from "@/components/badges"
import { SalonFallback } from "@/components/salon-fallback"
import { formatDistance } from "@/lib/geo"
import { genderLabel, inr } from "@/lib/format"
import type { SalonCard as SalonCardData } from "@/lib/salons"

export function SalonCard({
  salon,
  className,
  distanceKm = null,
}: {
  salon: SalonCardData
  className?: string
  distanceKm?: number | null
}) {
  const photo = salon.photos[0]
  const href = `/${salon.citySlug}/${salon.areaSlug}/${salon.slug}`
  const place = [salon.locality?.name, salon.city?.name].filter(Boolean).join(", ")
  return (
    <li className={className}>
      <Link
        href={href}
        className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 transition hover:-translate-y-0.5 hover:ring-foreground/20"
      >
        <div className="relative aspect-[16/10] bg-muted">
          {photo ? (
            // Owner uploads and sample SVGs. next/image does not allow SVG.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt={photo.alt || `${salon.name} in ${place || "the city"}`}
              width={640}
              height={400}
              className="h-full w-full object-cover"
            />
          ) : (
            <SalonFallback name={salon.name} place={place} />
          )}
          {salon.isDemo ? (
            <span className="absolute top-3 left-3">
              <SampleBadge />
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="font-heading text-xl leading-tight group-hover:text-primary">{salon.name}</h3>
          <p className="text-sm font-medium tabular-nums">
            {salon.startingPrice != null ? `from ${inr(salon.startingPrice)}` : "Price list coming soon"}
          </p>
          <p className="text-sm text-muted-foreground">
            {place || salon.areaSlug} · {genderLabel(salon.gender)}
            {distanceKm != null ? ` · ${formatDistance(distanceKm)} away` : ""}
          </p>
          {salon.isEarlyPartner ? (
            <div className="mt-auto pt-2">
              <EarlyPartnerBadge />
            </div>
          ) : null}
        </div>
      </Link>
    </li>
  )
}
