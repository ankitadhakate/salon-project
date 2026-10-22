import Link from "next/link"
import { AREAS } from "@/lib/areas"

export function SiteFooter() {
  const featured = ["koregaon-park", "baner", "kothrud", "hinjewadi", "kharadi", "viman-nagar"]
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-heading text-2xl">Saj</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            A free salon list for Pune. Customers browse. Salon owners publish their own prices,
            photos, and WhatsApp number.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Localities</p>
          <ul className="mt-2 grid grid-cols-2 gap-y-1 text-sm text-muted-foreground">
            {featured.map((slug) => {
              const area = AREAS.find((item) => item.slug === slug)
              if (!area) return null
              return (
                <li key={slug}>
                  <Link href={`/pune/${slug}`} className="hover:text-foreground">
                    {area.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-medium">Owners</p>
          <ul className="mt-2 grid gap-1 text-muted-foreground">
            <li>
              <Link href="/for-salons" className="hover:text-foreground">
                Early partner program
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-foreground">
                Create a listing
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-foreground">
                Owner login
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            Saj doesn&apos;t take bookings or payments. You talk to the salon directly.
          </p>
        </div>
      </div>
    </footer>
  )
}
