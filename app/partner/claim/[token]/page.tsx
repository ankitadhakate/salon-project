import type { Metadata } from "next"
import Link from "next/link"
import { claimSalon, confirmClaim } from "@/app/partner/actions"
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
  searchParams: Promise<{ error?: string; sent?: string; dev?: string; code?: string }>
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
  const usable = Boolean(
    invite &&
      !invite.usedAt &&
      !invite.revokedAt &&
      invite.expiresAt > new Date() &&
      invite.salon &&
      !invite.salon.ownerId,
  )
  const place = invite?.salon
    ? [invite.salon.locality?.name, invite.salon.city?.name].filter(Boolean).join(", ")
    : ""
  const sent = sp.sent === "1"
  const devLink =
    process.env.NODE_ENV !== "production" &&
    sp.dev?.startsWith("/partner/claim/verify?token=") &&
    sp.dev.length < 160
      ? sp.dev
      : ""
  const devCode = process.env.NODE_ENV !== "production" && /^\d{6}$/.test(sp.code ?? "") ? sp.code : ""

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="font-heading text-4xl">Claim my salon</h1>
      <div className="mt-4">
        <Flash error={sp.error?.slice(0, 240)} />
      </div>
      {!usable || !invite?.salon ? (
        <p className="mt-4 text-muted-foreground">
          This claim link has expired, was replaced, or was already used.{" "}
          <Link href="/partner/login" className="font-medium text-sage-ink">
            Log in
          </Link>{" "}
          if you already took it over.
        </p>
      ) : sent ? (
        <>
          <p className="mt-3 text-muted-foreground">
            We sent a confirmation link and a 6-digit code to{" "}
            <span className="font-medium text-foreground">{invite.email}</span>. Open the link, or enter the code
            here. It expires in 30 minutes.
          </p>
          {devLink ? (
            <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm break-all">
              Email isn&apos;t configured on this machine. Confirmation link: {devLink}
              {devCode ? ` Code: ${devCode}` : ""}
            </p>
          ) : null}
          <form action={confirmClaim} className="mt-6 grid gap-4">
            <input type="hidden" name="token" value={token} />
            <div className="grid gap-1.5">
              <Label htmlFor="code">Code from the email</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                className={field}
              />
            </div>
            <SubmitButton pendingLabel="Checking…" className="h-12 text-base">
              Claim my salon
            </SubmitButton>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            <Link href={`/partner/claim/${token}`} className="font-medium text-sage-ink">
              Send a new code
            </Link>
            . The new code replaces the previous one.
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-muted-foreground">
            {siteName()} created a listing for <span className="font-medium text-foreground">{invite.salon.name}</span>
            {place ? ` in ${place}` : ""}. We email a confirmation link to prove you control the address. The listing
            stays in draft until you submit it.
          </p>
          <form action={claimSalon} className="mt-6 grid gap-4">
            <input type="hidden" name="token" value={token} />
            <div className="grid gap-1.5">
              <Label htmlFor="email">
                {invite.email ? "Enter the email we sent the invite to" : "Email you'll log in with"}
              </Label>
              <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={invite.email} className={field} />
            </div>
            {invite.phone ? (
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone on the invite</Label>
                <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required className={field} />
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" autoComplete="name" className={field} />
              <p className="text-sm text-muted-foreground">Skip this if you already have a partner account for that email.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className={field}
              />
              <p className="text-sm text-muted-foreground">
                At least 8 characters. If the email already has an account, use that password.
              </p>
            </div>
            <SubmitButton pendingLabel="Sending…" className="h-12 text-base">
              Email me a confirmation code
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  )
}
