import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CustomerPreview } from "@/components/customer-preview"
import { Flash } from "@/components/flash"
import { buttonVariants } from "@/components/ui/button"
import { getSessionUser } from "@/lib/auth"
import { statusLabel } from "@/lib/format"
import { getOwnerSalon } from "@/lib/salons"
import { siteName } from "@/lib/site"
import { salonStatTotals } from "@/lib/stats"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Partner",
  robots: { index: false, follow: false },
}

const STATS = [
  ["Views", "views"],
  ["Calls", "calls"],
  ["WhatsApp", "whatsapps"],
  ["Directions", "directions"],
  ["Appointment requests", "appointments"],
  ["Shares", "shares"],
] as const

export default async function PartnerPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>
}) {
  const user = await getSessionUser()
  const sp = await searchParams
  if (!user) {
    const name = siteName()
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <p className="text-sm font-semibold text-sage-ink">For salon owners</p>
        <h1 className="mt-2 font-heading text-4xl leading-tight">List your salon on {name}</h1>
        <p className="mt-3 text-muted-foreground">
          Customers browse with no account. Owners use this partner area. Setup is five short steps
          and takes about five minutes.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link href="/partner/setup" className={cn(buttonVariants(), "h-12 text-base")}>
            Start setup
          </Link>
          <Link href="/partner/login" className={cn(buttonVariants({ variant: "outline" }), "h-12 text-base")}>
            Owner login
          </Link>
        </div>
      </div>
    )
  }
  if (user.role === "ADMIN") redirect("/admin")
  const salon = await getOwnerSalon(user.id)
  const stats = salon ? await salonStatTotals(salon.id, salon.city?.timezone ?? "Asia/Kolkata") : null
  const needsSetup =
    !salon || !salon.whatsapp || salon.services.length === 0 || salon.photos.length < 3 || salon.status === "DRAFT"

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <p className="text-sm text-muted-foreground">{user.email}</p>
      <h1 className="font-heading text-4xl">{salon ? salon.name : "Your salon"}</h1>
      <p className="mt-2 text-muted-foreground">
        {!salon
          ? "Five short steps. About five minutes. Customers never see a draft."
          : salon.status === "PENDING"
            ? "Pending review. Customers cannot see it until it is approved."
            : salon.status === "LIVE"
              ? "Live. Customers can see it. Everyday edits show straight away. Name, phone, WhatsApp, photos, and anything in the first 30 days wait for a review."
              : statusLabel(salon.status)}
      </p>
      <div className="mt-4">
        <Flash notice={sp.notice?.slice(0, 240)} error={sp.error?.slice(0, 240)} />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {needsSetup ? (
          <Link href="/partner/setup" className={cn(buttonVariants(), "h-12 px-4 text-base")}>
            {salon ? "Finish setup" : "Start setup"}
          </Link>
        ) : null}
        <Link
          href="/partner/edit"
          className={cn(buttonVariants({ variant: salon ? "outline" : "default" }), "h-12 px-4 text-base")}
        >
          Edit listing
        </Link>
      </div>

      <section className="mt-10" aria-labelledby="listing-stats">
        <h2 id="listing-stats" className="font-heading text-3xl">
          Listing stats
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Views, call taps, WhatsApp taps, direction taps, appointment requests, and shares. Counts
          only, per day. No visitor name, account, or address is stored.
        </p>
        {stats ? (
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {STATS.map(([label, key]) => (
              <div key={key} className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="font-heading text-3xl tabular-nums">{stats.week[key]}</dd>
                <dd className="text-sm font-medium">Last 7 days</dd>
                <dd className="text-sm text-muted-foreground tabular-nums">
                  {stats.today[key]} today · {stats.total[key]} total
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Stats start once the listing exists.</p>
        )}
      </section>

      {salon ? <CustomerPreview salon={salon} /> : null}
    </div>
  )
}
