import type { Metadata } from "next"
import { ListingEditor } from "@/components/listing-editor"
import { Flash } from "@/components/flash"
import { getSessionUser } from "@/lib/auth"
import { getOwnerSalon } from "@/lib/salons"

export const metadata: Metadata = {
  title: "Your listing",
  robots: { index: false, follow: false },
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>
}) {
  const user = await getSessionUser()
  if (!user) return null
  const salon = await getOwnerSalon(user.id)
  const sp = await searchParams

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-muted-foreground">{user.email}</p>
      <h1 className="font-heading text-4xl">{salon ? salon.name : "Your salon listing"}</h1>
      <p className="mt-2 text-muted-foreground">
        {user.referralCode
          ? `Referral code on this account: ${user.referralCode}.`
          : "One listing per account. It stays in draft until you submit it."}
      </p>
      <div className="mt-4">
        <Flash notice={sp.notice?.slice(0, 200)} error={sp.error?.slice(0, 200)} />
      </div>
      <div className="mt-6">
        <ListingEditor salon={salon} user={user} />
      </div>
    </div>
  )
}
