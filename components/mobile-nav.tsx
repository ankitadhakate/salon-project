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

export function MobileNav({ user }: { user: NavUser }) {
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
          <DialogTitle className="font-heading text-2xl">Saj</DialogTitle>
          <DialogDescription>Salons in Pune, listed by the people who run them.</DialogDescription>
        </DialogHeader>
        <nav className="grid text-lg">
          <Link className="rounded-lg px-1 py-3" href="/pune">
            Browse areas
          </Link>
          <Link className="rounded-lg px-1 py-3" href="/for-salons">
            List your salon
          </Link>
          {user?.role === "ADMIN" ? (
            <Link className="rounded-lg px-1 py-3" href="/admin">
              Admin
            </Link>
          ) : null}
          {user ? (
            <Link className="rounded-lg px-1 py-3" href="/dashboard">
              Your listing
            </Link>
          ) : (
            <Link className="rounded-lg px-1 py-3" href="/login">
              Log in
            </Link>
          )}
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
            href="/signup"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground"
          >
            Create a free listing
          </Link>
        )}
      </DialogContent>
    </Dialog>
  )
}
