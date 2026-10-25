import type { Metadata } from "next"
import Link from "next/link"
import { createUnclaimedListing, resendClaim, setListingStatus, updateApprovalMode } from "@/app/admin/actions"
import { AdminDirectory } from "@/components/admin-directory"
import { CityLocalityFields } from "@/components/city-locality-fields"
import { Badge } from "@/components/ui/badge"
import { Flash } from "@/components/flash"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { allowIndexing, indexMinSalons } from "@/lib/indexing"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { formatWhen, genderLabel, statusLabel } from "@/lib/format"
import { getRequireApproval } from "@/lib/settings"
import { appUrl } from "@/lib/urls"

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string; claim?: string }>
}) {
  const user = await getSessionUser()
  if (!user || user.role !== "ADMIN") return null
  const sp = await searchParams
  const claimPath = sp.claim && /^\/partner\/claim\/[a-f0-9]{64}$/.test(sp.claim) ? sp.claim : ""
  const [requireApproval, salons, owners, cities, realLive, audits] = await Promise.all([
    getRequireApproval(),
    prisma.salon.findMany({
      include: { owner: { select: { name: true, email: true, referralCode: true, isDemo: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "OWNER" },
      include: { salon: { select: { name: true, status: true, citySlug: true, areaSlug: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.city.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        localities: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        serviceGuides: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      },
    }),
    prisma.salon.count({ where: { status: "LIVE", isDemo: false } }),
    prisma.listingAudit.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
  ])
  const auditsBySalon = new Map<string, typeof audits>()
  for (const audit of audits) {
    const list = auditsBySalon.get(audit.salonId) ?? []
    if (list.length < 4) list.push(audit)
    auditsBySalon.set(audit.salonId, list)
  }

  const counts = {
    owners: owners.length,
    pending: salons.filter((salon) => salon.status === "PENDING").length,
    live: salons.filter((salon) => salon.status === "LIVE").length,
    hidden: salons.filter((salon) => salon.status === "HIDDEN").length,
  }
  const referrals = new Map<string, number>()
  for (const owner of owners) {
    const code = owner.referralCode?.trim() || "(none)"
    referrals.set(code, (referrals.get(code) ?? 0) + 1)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-heading text-4xl">Review desk</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {user.email}. {cities.length} cities,{" "}
        {cities.reduce((sum, city) => sum + city.localities.length, 0)} localities. Sample listings
        stay labelled Sample and are removed with npm run db:clear-demo. Search indexing is{" "}
        {allowIndexing() ? "on" : "off"}. Directory pages need a written intro and at least{" "}
        {indexMinSalons()} approved non-sample salons ({realLive} live right now).
      </p>
      <div className="mt-4">
        <Flash notice={sp.notice?.slice(0, 200)} error={sp.error?.slice(0, 200)} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Owner signups", counts.owners],
          ["Pending", counts.pending],
          ["Live", counts.live],
          ["Hidden", counts.hidden],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-heading text-3xl">{value}</dd>
          </div>
        ))}
      </dl>

      <form action={updateApprovalMode} className="mt-6 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="requireApproval"
            defaultChecked={requireApproval}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            <span className="font-medium">Require a review before a listing goes live</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Leave this on while you check that early salons are real. Turn it off and new
              submissions publish themselves.
            </span>
          </span>
        </label>
        <SubmitButton className="mt-4 h-10 px-3">Save approval setting</SubmitButton>
      </form>

      <h2 className="mt-10 font-heading text-3xl">Create a listing for a salon</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The salon has no owner yet. Add an email or a phone number, then send the claim link. The owner
        confirms the email with a code, takes over the draft, and edits it. A new link revokes the older
        ones. Submitting still waits in this queue.
      </p>
      {claimPath ? (
        <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm break-all">
          Claim link: {appUrl(claimPath)}
        </p>
      ) : null}
      <form action={createUnclaimedListing} className="mt-4 grid gap-4 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
        <div className="grid gap-1.5">
          <Label htmlFor="claim-name">Salon name</Label>
          <Input id="claim-name" name="name" required className="h-12 px-3 text-base md:text-base" />
        </div>
        <CityLocalityFields
          cities={cities.map((city) => ({
            slug: city.slug,
            name: city.name,
            localities: city.localities.map((area) => ({ slug: area.slug, name: area.name })),
          }))}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="claim-address">Street address</Label>
          <Input id="claim-address" name="address" required className="h-12 px-3 text-base md:text-base" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="claim-gender">Who is it for?</Label>
          <select
            id="claim-gender"
            name="gender"
            defaultValue="UNISEX"
            className="h-12 w-full rounded-lg border border-input bg-card px-3 text-base"
          >
            <option value="UNISEX">Everyone</option>
            <option value="WOMEN">Women</option>
            <option value="MEN">Men</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="claim-email">Owner email</Label>
          <Input id="claim-email" name="email" type="email" className="h-12 px-3 text-base md:text-base" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="claim-phone">Owner phone</Label>
          <Input id="claim-phone" name="phone" inputMode="tel" placeholder="Email or phone is enough" className="h-12 px-3 text-base md:text-base" />
        </div>
        <SubmitButton className="h-12 text-base">Create listing and claim link</SubmitButton>
      </form>

      <h2 className="mt-10 font-heading text-3xl">Listings</h2>
      {salons.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No listings yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {salons.map((salon) => (
            <li key={salon.id} className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-heading text-2xl">{salon.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {salon.areaSlug} · {genderLabel(salon.gender)} · {salon.owner?.email ?? "Unclaimed"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={salon.status === "LIVE" ? "default" : "secondary"}>
                    {statusLabel(salon.status)}
                  </Badge>
                  {salon.isDemo ? <Badge variant="outline">Sample</Badge> : null}
                  {salon.isEarlyPartner ? <Badge variant="outline">Early partner</Badge> : null}
                </div>
              </div>
              {salon.referralCode ? (
                <p className="mt-2 text-sm text-muted-foreground">Referral {salon.referralCode}</p>
              ) : null}
              {(auditsBySalon.get(salon.id) ?? []).length ? (
                <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  {(auditsBySalon.get(salon.id) ?? []).map((audit) => (
                    <li key={audit.id}>
                      {audit.field}: {(audit.oldValue || "—").slice(0, 80)} → {(audit.newValue || "—").slice(0, 80)} ·{" "}
                      {formatWhen(audit.createdAt)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {salon.status !== "LIVE" ? (
                  <form action={setListingStatus}>
                    <input type="hidden" name="id" value={salon.id} />
                    <input type="hidden" name="status" value="LIVE" />
                    <SubmitButton className="h-10 px-3">Approve</SubmitButton>
                  </form>
                ) : null}
                {salon.status !== "HIDDEN" ? (
                  <form action={setListingStatus}>
                    <input type="hidden" name="id" value={salon.id} />
                    <input type="hidden" name="status" value="HIDDEN" />
                    <SubmitButton variant="outline" className="h-10 px-3">
                      Hide
                    </SubmitButton>
                  </form>
                ) : null}
                {salon.status !== "PENDING" && salon.status !== "DRAFT" ? (
                  <form action={setListingStatus}>
                    <input type="hidden" name="id" value={salon.id} />
                    <input type="hidden" name="status" value="PENDING" />
                    <SubmitButton variant="outline" className="h-10 px-3">
                      Mark pending
                    </SubmitButton>
                  </form>
                ) : null}
                {!salon.owner ? (
                  <form action={resendClaim}>
                    <input type="hidden" name="id" value={salon.id} />
                    <SubmitButton variant="outline" className="h-10 px-3">
                      New claim link
                    </SubmitButton>
                  </form>
                ) : null}
                <Link
                  href={`/${salon.citySlug}/${salon.areaSlug}/${salon.slug}`}
                  className="inline-flex h-10 items-center px-2 text-sm font-medium text-sage-ink"
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 font-heading text-3xl">Signups</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Referral codes:{" "}
        {[...referrals.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([code, count]) => `${code} (${count})`)
          .join(", ") || "none yet"}
      </p>
      <ul className="mt-4 grid gap-3">
        {owners.map((owner) => (
          <li key={owner.id} className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{owner.name}</p>
              <p className="text-sm text-muted-foreground">{formatWhen(owner.createdAt)}</p>
            </div>
            <p className="text-sm text-muted-foreground">{owner.email}</p>
            <p className="mt-1 text-sm">
              {owner.referralCode ? `Referral ${owner.referralCode}` : "No referral code"}
              {owner.isDemo ? " · Sample account" : ""}
            </p>
            <p className="mt-1 text-sm">
              {owner.salon ? (
                <>
                  {owner.salon.name} · {statusLabel(owner.salon.status)} ·{" "}
                  <Link className="text-sage-ink" href={`/${owner.salon.citySlug}/${owner.salon.areaSlug}/${owner.salon.slug}`}>
                    page
                  </Link>
                </>
              ) : (
                "No listing yet"
              )}
            </p>
          </li>
        ))}
      </ul>

      <AdminDirectory cities={cities} />
    </div>
  )
}
