import Link from "next/link"

export function AreaGrid({
  citySlug,
  localities,
  counts,
}: {
  citySlug: string
  localities: { slug: string; name: string }[]
  counts: Map<string, number>
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {localities.map((area) => {
        const count = counts.get(area.slug) ?? 0
        return (
          <li key={area.slug}>
            <Link
              href={`/${citySlug}/${area.slug}`}
              className="flex h-full flex-col justify-between rounded-2xl bg-card px-3 py-3 shadow-card ring-1 ring-border hover:ring-sage"
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
