import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { MobileNav } from "@/components/mobile-nav"
import { listActiveCities } from "@/lib/places"
import { siteName } from "@/lib/site"
import { cn } from "@/lib/utils"

type NavUser = { name: string; role: string } | null

export async function SiteHeader({ user }: { user: NavUser }) {
  const cities = await listActiveCities()
  const browse = cities[0] ? `/${cities[0].slug}` : "/"
  const name = siteName()
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="h-1 bg-primary" />
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3">
        <Link href="/" className="font-heading text-[1.7rem] leading-none tracking-tight">
          {name}
        </Link>
        <p className="hidden text-sm text-muted-foreground lg:block">Salon listings</p>
        <div className="ml-auto flex items-center gap-2 sm:gap-5">
          <Link
            href="/partner"
            className={cn(buttonVariants(), "h-9 px-2.5 text-xs sm:h-10 sm:px-3 sm:text-sm")}
          >
            List your salon free
          </Link>
          <nav className="hidden items-center gap-5 text-sm sm:flex">
            <Link href={browse} className="hover:text-primary">
              Browse
            </Link>
            <Link href="/for-salons" className="hover:text-primary">
              For salons
            </Link>
            {user?.role === "ADMIN" ? (
              <Link href="/admin" className="hover:text-primary">
                Admin
              </Link>
            ) : null}
            {user && user.role !== "ADMIN" ? (
              <Link href="/partner" className="hover:text-primary">
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
    </header>
  )
}
