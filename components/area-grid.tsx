import Link from "next/link"
import { AREAS } from "@/lib/areas"

export function AreaGrid({ counts }: { counts: Map<string, number> }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {AREAS.map((area) => {
        const count = counts.get(area.slug) ?? 0
        return (
          <li key={area.slug}>
            <Link
              href={`/pune/${area.slug}`}
              className="flex h-full flex-col justify-between rounded-2xl bg-card px-3 py-3 ring-1 ring-foreground/10 hover:ring-foreground/25"
            >
              <span className="font-medium">{area.name}</span>
              <span className="mt-2 text-xs text-muted-foreground">
                {count === 0 ? "No listings yet" : count === 1 ? "1 salon" : `${count} salons`}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
