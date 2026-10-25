"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type NavUser = { name: string; role: string } | null

export function MobileNav({
  user,
  browseHref,
  siteName,
}: {
  user: NavUser
  browseHref: string
  siteName: string
}) {
  return (
    <Dialog>
      <DialogTrigger
        className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-card sm:hidden"
        aria-label="Open menu"
      >
        <Menu />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{siteName}</DialogTitle>
          <DialogDescription>Salons listed by the people who run them.</DialogDescription>
        </DialogHeader>
        <nav className="grid text-lg">
          <Link className="flex min-h-11 items-center rounded-lg px-1" href={browseHref}>
            Browse
          </Link>
          <Link className="flex min-h-11 items-center rounded-lg px-1" href="/for-salons">
            List your salon free
          </Link>
          {user?.role === "ADMIN" ? (
            <Link className="flex min-h-11 items-center rounded-lg px-1" href="/admin">
              Admin
            </Link>
          ) : null}
          {user && user.role !== "ADMIN" ? (
            <Link className="flex min-h-11 items-center rounded-lg px-1" href="/partner">
              Partner
            </Link>
          ) : null}
          {!user ? (
            <Link className="flex min-h-11 items-center rounded-lg px-1" href="/partner/login">
              Owner login
            </Link>
          ) : null}
        </nav>
        {user ? (
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="h-11 w-full rounded-lg border border-border text-sm font-medium"
            >
              Log out
            </button>
          </form>
        ) : (
          <Link
            href="/partner"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground"
          >
            List your salon free
          </Link>
        )}
      </DialogContent>
    </Dialog>
  )
}
