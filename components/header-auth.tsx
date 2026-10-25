"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { headerSessionLinks, type HeaderAccount } from "@/lib/header-auth"

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
    <div className="flex items-center gap-3">
      {links.map((link) =>
        link.kind === "logout" ? (
          <form key={link.label} action="/auth/logout" method="post">
            <button type="submit" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              {link.label}
            </button>
          </form>
        ) : link.label === "Login" ? (
          <Link
            key={link.label}
            href={link.href}
            className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold whitespace-nowrap text-primary-foreground hover:bg-primary-hover"
          >
            {link.label}
          </Link>
        ) : (
          <Link key={link.label} href={link.href} className="text-sm font-semibold whitespace-nowrap hover:text-sage-ink">
            {link.label}
          </Link>
        ),
      )}
    </div>
  )
}
