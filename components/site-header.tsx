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
        <div className="flex min-w-0 items-center justify-end">
          <HeaderAuth />
        </div>
      </div>
    </header>
  )
}
