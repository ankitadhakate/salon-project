import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ListingEditor } from "@/components/listing-editor"
import { Flash } from "@/components/flash"
import { getSessionUser } from "@/lib/auth"
import { listActiveCities } from "@/lib/places"
import { getOwnerSalon } from "@/lib/salons"

export const metadata: Metadata = {
  title: "Edit your listing",
  robots: { index: false, follow: false },
}

export default async function PartnerEditPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect("/partner/login?next=/partner/edit")
  const [salon, cities] = await Promise.all([getOwnerSalon(user.id), listActiveCities()])
  const sp = await searchParams

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm">
        <Link href="/partner" className="font-medium text-primary">
          Partner dashboard
        </Link>
      </p>
      <p className="mt-3 text-sm text-muted-foreground">{user.email}</p>
      <h1 className="font-heading text-4xl">{salon ? salon.name : "Your salon listing"}</h1>
      <p className="mt-2 text-muted-foreground">
        {user.referralCode
          ? `Referral code on this account: ${user.referralCode}.`
          : "One listing per account. Submit it when the price list and photos are ready."}
      </p>
      <div className="mt-4">
        <Flash notice={sp.notice?.slice(0, 200)} error={sp.error?.slice(0, 200)} />
      </div>
      <div className="mt-6">
        <ListingEditor
          salon={salon}
          user={user}
          cities={cities.map((city) => ({
            slug: city.slug,
            name: city.name,
            dialCode: city.dialCode,
            localities: city.localities,
          }))}
        />
      </div>
    </div>
  )
}
