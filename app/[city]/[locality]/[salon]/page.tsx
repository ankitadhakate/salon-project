import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SalonPublicView } from "@/components/salon-public"
import { ViewBeacon } from "@/components/view-beacon"
import { genderLabel, inr } from "@/lib/format"
import { robotsFor } from "@/lib/indexing"
import { getSessionUser } from "@/lib/auth"
import { getSalonBySlug, viewerCanSee } from "@/lib/salons"

type Props = {
  params: Promise<{ city: string; locality: string; salon: string }>
  searchParams: Promise<{ preview?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, locality: areaSlug, salon: slug } = await params
  const salon = await getSalonBySlug(citySlug, areaSlug, slug)
  const place = salon ? `${salon.locality?.name ?? areaSlug}, ${salon.city?.name ?? citySlug}` : ""
  if (!salon) notFound()
  if (salon.status !== "LIVE") {
    return { title: salon.name, robots: robotsFor(false) }
  }
  const title = `${salon.name} in ${place}`
  const price = salon.startingPrice != null ? ` Services from ${inr(salon.startingPrice)}.` : ""
  const description = `${salon.name} is a ${genderLabel(salon.gender).toLowerCase()} salon in ${place}.${price} ${salon.description}`.slice(0, 180)
  const path = `/${citySlug}/${areaSlug}/${salon.slug}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website" },
    robots: robotsFor(!salon.isDemo),
  }
}

export default async function SalonPage({ params, searchParams }: Props) {
  const { city: citySlug, locality: areaSlug, salon: slug } = await params
  const sp = await searchParams
  const salon = await getSalonBySlug(citySlug, areaSlug, slug)
  if (!salon?.city || !salon.locality) notFound()
  const viewer = await getSessionUser()
  const access = viewerCanSee(salon, viewer)
  if (!access.visible) notFound()
  const ownerPreview =
    sp.preview === "1" && Boolean(viewer && (viewer.role === "ADMIN" || viewer.id === salon.ownerId))
  const countView = !access.preview && !ownerPreview && salon.status === "LIVE" && !salon.isDemo

  return (
    <>
      {countView ? <ViewBeacon salonId={salon.id} /> : null}
      <SalonPublicView salon={salon} preview={access.preview || ownerPreview} />
    </>
  )
}
