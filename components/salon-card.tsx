import Link from "next/link"
import { getArea } from "@/lib/areas"
import { EarlyPartnerBadge, SampleBadge } from "@/components/badges"
import { genderLabel, inr } from "@/lib/format"
import type { SalonCard } from "@/lib/salons"

export function SalonCard({ salon }: { salon: SalonCard }) {
  const area = getArea(salon.areaSlug)
  const photo = salon.photos[0]
  const href = `/pune/${salon.areaSlug}/${salon.slug}`
  return (
    <li>
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
              alt={photo.alt || `${salon.name} in ${area?.name ?? "Pune"}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center font-heading text-4xl text-muted-foreground">
              {salon.name.slice(0, 1)}
            </div>
          )}
          {salon.isDemo ? (
            <span className="absolute top-3 left-3">
              <SampleBadge />
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading text-xl leading-tight group-hover:text-primary">
              {salon.name}
            </h3>
            {salon.startingPrice != null ? (
              <p className="shrink-0 text-sm font-medium tabular-nums">
                from {inr(salon.startingPrice)}
              </p>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {area?.name ?? salon.areaSlug} · {genderLabel(salon.gender)}
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
