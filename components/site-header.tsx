import Link from "next/link"
import { AreaPill } from "@/components/area-pill"
import { HeaderAuth } from "@/components/header-auth"
import { ScrollHeader } from "@/components/scroll-header"
import { siteName } from "@/lib/site"

export function SiteHeader() {
  const name = siteName()
  return (
    <header className="site-header sticky top-0 z-40 border-b border-border bg-white">
      <ScrollHeader />
      <div className="header-row mx-auto grid h-14 w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-3 sm:px-4">
        <div className="min-w-0">
          <AreaPill />
        </div>
        <Link
          href="/"
          className="wordmark max-w-full truncate px-2 text-center font-heading text-lg leading-none font-bold tracking-tight"
        >
          {name}
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-1.5 md:gap-3">
          <Link
            href="/partner"
            aria-label="List your salon free"
            className="inline-flex h-8 shrink-0 items-center rounded-full bg-primary px-2.5 text-xs font-semibold whitespace-nowrap text-primary-foreground hover:bg-primary-hover md:h-9 md:px-3 md:text-sm"
          >
            <span className="md:hidden">List</span>
            <span className="hidden md:inline">List your salon free</span>
          </Link>
          <HeaderAuth />
        </div>
      </div>
    </header>
  )
}
