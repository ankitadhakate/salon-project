import Link from "next/link"
import { ScrollHeader } from "@/components/scroll-header"
import { siteName } from "@/lib/site"
import { cn } from "@/lib/utils"

type NavUser = { name: string; role: string } | null

export async function SiteHeader({ user }: { user: NavUser }) {
  const name = siteName()
  return (
    <header className="site-header sticky top-0 z-40 border-b border-border bg-white">
      <ScrollHeader />
      <div className="header-row mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="inline-flex h-11 shrink-0 items-center font-heading text-2xl leading-none tracking-tight">
          {name}
        </Link>
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <Link href="/partner" className="text-sm font-semibold whitespace-nowrap hover:text-sage-ink">
            List your salon free
          </Link>
          {user?.role === "ADMIN" ? (
            <Link href="/admin" className="text-sm font-semibold whitespace-nowrap hover:text-sage-ink">
              Admin
            </Link>
          ) : null}
          {user ? (
            <form action="/auth/logout" method="post">
              <button type="submit" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                Log out
              </button>
            </form>
          ) : (
            <Link
              href="/partner/login"
              className={cn(
                "inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold whitespace-nowrap text-primary-foreground hover:bg-primary-hover",
              )}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
