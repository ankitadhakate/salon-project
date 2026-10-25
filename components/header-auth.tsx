"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { headerSessionLinks, type HeaderAccount, type HeaderLink } from "@/lib/header-auth"

/** Login is the only auth control in the server HTML. Dashboard and Log out arrive after a no-store fetch. */
export function HeaderAuth() {
  const [user, setUser] = useState<HeaderAccount>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((body: { user?: HeaderAccount }) => {
        if (!cancelled) setUser(body.user ?? null)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const links = headerSessionLinks(user)
  return (
    <>
      <div className="hidden items-center gap-3 md:flex">{links.map((link) => renderLink(link, "desktop"))}</div>
      <div className="md:hidden">
        {user ? <AccountMenu links={links} /> : links.map((link) => renderLink(link, "compact"))}
      </div>
    </>
  )
}

function AccountMenu({ links }: { links: HeaderLink[] }) {
  return (
    <details className="relative">
      <summary className="flex h-8 cursor-pointer list-none items-center rounded-full bg-primary px-2.5 text-xs font-semibold text-primary-foreground [&::-webkit-details-marker]:hidden">
        Account
      </summary>
      <div className="absolute right-0 z-50 mt-2 grid min-w-36 gap-1 rounded-xl bg-white p-2 text-foreground shadow-card ring-1 ring-border">
        {links.map((link) => renderLink(link, "menu"))}
      </div>
    </details>
  )
}

function renderLink(link: HeaderLink, size: "desktop" | "compact" | "menu") {
  if (link.kind === "logout") {
    return (
      <form key={link.label} action="/auth/logout" method="post">
        <button
          type="submit"
          className={
            size === "menu"
              ? "flex h-10 w-full items-center rounded-lg px-2 text-left text-sm font-semibold hover:bg-secondary"
              : "text-sm font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground"
          }
        >
          {link.label}
        </button>
      </form>
    )
  }
  if (link.label === "Login") {
    return (
      <Link
        key={link.label}
        href={link.href}
        className={
          size === "compact"
            ? "inline-flex h-8 items-center rounded-full bg-primary px-2.5 text-xs font-semibold whitespace-nowrap text-primary-foreground hover:bg-primary-hover"
            : "inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold whitespace-nowrap text-primary-foreground hover:bg-primary-hover"
        }
      >
        {link.label}
      </Link>
    )
  }
  return (
    <Link
      key={link.label}
      href={link.href}
      className={
        size === "menu"
          ? "flex h-10 items-center rounded-lg px-2 text-sm font-semibold hover:bg-secondary"
          : "text-sm font-semibold whitespace-nowrap hover:text-sage-ink"
      }
    >
      {link.label}
    </Link>
  )
}
