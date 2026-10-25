import Link from "next/link"
import { Scissors, Sparkles, Hand, Brush, Heart, UserRound } from "lucide-react"

const tiles = [
  { label: "Haircut", href: "/search?q=haircut", icon: Scissors },
  { label: "Spa", href: "/search?category=Spa", icon: Sparkles },
  { label: "Nails", href: "/search?category=Nails", icon: Hand },
  { label: "Makeup", href: "/search?category=Makeup", icon: Brush },
  { label: "Bridal", href: "/search?q=bridal%20makeup", icon: Heart },
  { label: "Beard", href: "/search?q=beard", icon: UserRound },
]

export function CategoryRail() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6" aria-label="Categories">
      <ul className="flex min-w-0 gap-3 overflow-x-auto pb-1">
        {tiles.map((tile) => {
          const Icon = tile.icon
          return (
            <li key={tile.label} className="shrink-0">
              <Link
                href={tile.href}
                className="press flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-2xl bg-card text-sm font-medium shadow-card ring-1 ring-border"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-blush text-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                {tile.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
