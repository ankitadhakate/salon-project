import type { Metadata } from "next"
import Link from "next/link"
import { claimSalon } from "@/app/partner/actions"
import { Flash } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { hashMagicToken } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { siteName } from "@/lib/site"

export const metadata: Metadata = {
  title: "Claim your salon",
  robots: { index: false, follow: false },
}

const field = "h-12 px-3 text-base md:text-base"

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const sp = await searchParams
  const valid = /^[a-f0-9]{64}$/.test(token)
  const invite = valid
    ? await prisma.claimInvite.findUnique({
        where: { tokenHash: hashMagicToken(token) },
        include: { salon: { include: { city: true, locality: true } } },
      })
    : null
  const usable = Boolean(invite && !invite.usedAt && invite.expiresAt > new Date() && invite.salon && !invite.salon.ownerId)
  const place = invite?.salon
    ? [invite.salon.locality?.name, invite.salon.city?.name].filter(Boolean).join(", ")
    : ""

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-4xl">Claim this salon</h1>
      <div className="mt-4">
        <Flash error={sp.error?.slice(0, 240)} />
      </div>
      {!usable || !invite?.salon ? (
        <p className="mt-4 text-muted-foreground">
          This claim link has expired or was already used.{" "}
          <Link href="/partner/login" className="font-medium text-primary">
            Log in
          </Link>{" "}
          if you already took it over.
        </p>
      ) : (
        <>
          <p className="mt-3 text-muted-foreground">
            {siteName()} created a listing for <span className="font-medium text-foreground">{invite.salon.name}</span>
            {place ? ` in ${place}` : ""}. Confirm the contact on the invite, then the listing is yours. It stays
            in draft until you submit it.
          </p>
          <form action={claimSalon} className="mt-6 grid gap-4">
            <input type="hidden" name="token" value={token} />
            <div className="grid gap-1.5">
              <Label htmlFor="email">{invite.email ? "Email on the invite" : "Email you'll log in with"}</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required className={field} />
            </div>
            {invite.phone ? (
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone on the invite</Label>
                <Input id="phone" name="phone" inputMode="tel" autoComplete="tel" required className={field} />
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" autoComplete="name" className={field} />
              <p className="text-xs text-muted-foreground">Skip this if you already have a partner account for that email.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={field} />
              <p className="text-xs text-muted-foreground">At least 8 characters. If the email already has an account, use that password.</p>
            </div>
            <SubmitButton pendingLabel="Claiming…" className="h-12 text-base">
              Take over this listing
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  )
}
