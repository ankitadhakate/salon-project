import Link from "next/link"
import { SalonCard } from "@/components/salon-card"
import type { ListedSalon } from "@/lib/salons"

export function SalonRail({
  title,
  href,
  salons,
}: {
  title: string
  href?: string
  salons: ListedSalon[]
}) {
  if (salons.length === 0) return null
  return (
    <section className="mx-auto max-w-6xl px-4 py-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="font-heading text-2xl sm:text-3xl">{title}</h2>
        {href ? (
          <Link href={href} className="inline-flex h-11 items-center text-sm font-medium text-sage-ink">
            See all
          </Link>
        ) : null}
      </div>
      <ul className="flex min-w-0 gap-4 overflow-x-auto pb-2">
        {salons.map((salon, index) => (
          <SalonCard
            key={salon.id}
            salon={salon}
            distanceKm={salon.distanceKm}
            className={`w-72 shrink-0 rise rise-${Math.min(index, 5)}`}
          />
        ))}
      </ul>
    </section>
  )
}
