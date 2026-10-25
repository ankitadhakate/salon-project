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
      <div className="header-row mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="wordmark inline-flex h-10 shrink-0 items-center font-heading text-lg leading-none font-bold tracking-tight">
          {name}
        </Link>
        <AreaPill />
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/partner"
            className="hidden h-9 items-center rounded-full bg-primary px-3 text-sm font-semibold whitespace-nowrap text-primary-foreground hover:bg-primary-hover sm:inline-flex"
          >
            List your salon free
          </Link>
          <HeaderAuth />
        </div>
      </div>
    </header>
  )
}
