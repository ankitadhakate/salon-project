import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { LocationPill } from "@/components/location-pill"
import { MobileNav } from "@/components/mobile-nav"
import { OmniSearch } from "@/components/omni-search"
import { ScrollHeader } from "@/components/scroll-header"
import { listActiveCities } from "@/lib/places"
import { siteName } from "@/lib/site"
import { cn } from "@/lib/utils"

type NavUser = { name: string; role: string } | null

export async function SiteHeader({ user }: { user: NavUser }) {
  const cities = await listActiveCities()
  const browse = cities[0] ? `/${cities[0].slug}` : "/"
  const name = siteName()
  return (
    <header className="site-header sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur">
      <ScrollHeader />
      <div className="h-1 bg-mustard" />
      <div className="header-row mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3">
        <Link href="/" className="inline-flex h-11 shrink-0 items-center font-heading text-2xl leading-none tracking-tight sm:text-[1.7rem]">
          {name}
        </Link>
        <LocationPill />
        <div className="header-search hidden min-w-0 flex-1 md:block">
          <OmniSearch compact />
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-5">
          <Link
            href="/partner"
            className={cn(buttonVariants(), "hidden h-11 px-3 text-xs sm:inline-flex sm:text-sm")}
          >
            List your salon free
          </Link>
          <nav className="hidden items-center gap-5 text-sm sm:flex">
            <Link href={browse} className="hover:text-sage-ink">
              Browse
            </Link>
            <Link href="/for-salons" className="hover:text-sage-ink">
              For salons
            </Link>
            {user?.role === "ADMIN" ? (
              <Link href="/admin" className="hover:text-sage-ink">
                Admin
              </Link>
            ) : null}
            {user && user.role !== "ADMIN" ? (
              <Link href="/partner" className="hover:text-sage-ink">
                Partner
              </Link>
            ) : null}
            {user ? (
              <form action="/auth/logout" method="post">
                <button type="submit" className="text-muted-foreground hover:text-foreground">
                  Log out
                </button>
              </form>
            ) : null}
          </nav>
          <div className="sm:hidden">
            <MobileNav user={user} browseHref={browse} siteName={name} />
          </div>
        </div>
      </div>
      <div className="header-search-mobile mx-auto max-w-6xl px-4 pb-3">
        <OmniSearch compact />
      </div>
    </header>
  )
}
