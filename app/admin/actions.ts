"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSessionUser, hashMagicToken, newMagicToken } from "@/lib/auth"
import { EARLY_PARTNER_PROGRAM, GENDERS } from "@/lib/constants"
import { prisma } from "@/lib/db"
import { sendClaimMail, smtpConfigured } from "@/lib/mail"
import { citySlugError, cleanSlug, getLocality, localitySlugError } from "@/lib/places"
import { defaultHours, refreshSalonSearch, uniqueSlug } from "@/lib/salons"
import { setRequireApproval } from "@/lib/settings"
import { appUrl } from "@/lib/urls"
import { normalizePhone } from "@/lib/validators"

async function requireAdmin() {
  const user = await getSessionUser()
  if (!user) redirect("/partner/login?next=/admin")
  if (user.role !== "ADMIN") redirect("/")
  return user
}

function adminRedirect(opts: { notice?: string; error?: string; claim?: string }): never {
  const params = new URLSearchParams()
  if (opts.notice) params.set("notice", opts.notice)
  if (opts.error) params.set("error", opts.error)
  if (opts.claim) params.set("claim", opts.claim)
  redirect(`/admin?${params.toString()}`)
}

export async function setListingStatus(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const status = String(formData.get("status") ?? "")
  if (status !== "LIVE" && status !== "HIDDEN" && status !== "PENDING") {
    adminRedirect({ error: "Unknown status." })
  }
  const salon = await prisma.salon.findUnique({ where: { id } })
  if (!salon) adminRedirect({ error: "That listing no longer exists." })
  await prisma.salon.update({ where: { id }, data: { status } })
  revalidatePath("/")
  revalidatePath(`/${salon.citySlug}`)
  revalidatePath(`/${salon.citySlug}/${salon.areaSlug}`)
  revalidatePath(`/${salon.citySlug}/${salon.areaSlug}/${salon.slug}`)
  revalidatePath(`/${salon.citySlug}/service`)
  revalidatePath("/admin")
  revalidatePath("/sitemap.xml")
  const notice =
    status === "LIVE" ? "Listing is live." : status === "HIDDEN" ? "Listing hidden." : "Marked pending."
  adminRedirect({ notice })
}

function revalidateDirectory() {
  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/sitemap.xml")
}

export async function addCity(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get("name") ?? "").trim()
  if (name.length < 2 || name.length > 80) adminRedirect({ error: "Add a city name." })
  const slug = cleanSlug(String(formData.get("slug") ?? ""), name)
  const slugError = citySlugError(slug)
  if (slugError) adminRedirect({ error: slugError })
  const countryCode = (String(formData.get("countryCode") ?? "IN").trim().toUpperCase() || "IN").slice(0, 2)
  const dialCode = String(formData.get("dialCode") ?? "91").replace(/\D/g, "").slice(0, 4) || "91"
  const timezone = String(formData.get("timezone") ?? "Asia/Kolkata").trim() || "Asia/Kolkata"
  const existing = await prisma.city.findUnique({ where: { slug } })
  if (existing) adminRedirect({ error: "That city slug is already in use." })
  await prisma.city.create({
    data: { slug, name, countryCode, dialCode, timezone, intro: "", active: true },
  })
  revalidateDirectory()
  revalidatePath(`/${slug}`)
  adminRedirect({ notice: `${name} is on the city list. Write an intro before it can be indexed.` })
}

export async function addLocality(formData: FormData) {
  await requireAdmin()
  const citySlug = String(formData.get("citySlug") ?? "").trim()
  const city = await prisma.city.findUnique({ where: { slug: citySlug } })
  if (!city) adminRedirect({ error: "Choose a city first." })
  const name = String(formData.get("name") ?? "").trim()
  if (name.length < 2 || name.length > 80) adminRedirect({ error: "Add a locality name." })
  const slug = cleanSlug(String(formData.get("slug") ?? ""), name)
  const slugError = localitySlugError(slug)
  if (slugError) adminRedirect({ error: slugError })
  const taken = await prisma.locality.findUnique({ where: { citySlug_slug: { citySlug, slug } } })
  if (taken) adminRedirect({ error: "That locality already exists in this city." })
  const count = await prisma.locality.count({ where: { citySlug } })
  await prisma.locality.create({ data: { citySlug, slug, name, sortOrder: count, intro: "" } })
  revalidateDirectory()
  revalidatePath(`/${citySlug}`)
  adminRedirect({ notice: `${name} added to ${city.name}.` })
}

export async function addServiceGuide(formData: FormData) {
  await requireAdmin()
  const citySlug = String(formData.get("citySlug") ?? "").trim()
  const city = await prisma.city.findUnique({ where: { slug: citySlug } })
  if (!city) adminRedirect({ error: "Choose a city first." })
  const name = String(formData.get("name") ?? "").trim()
  if (name.length < 2 || name.length > 80) adminRedirect({ error: "Add a service name." })
  const slug = cleanSlug(String(formData.get("slug") ?? ""), name)
  const slugError = localitySlugError(slug)
  if (slugError) adminRedirect({ error: slugError })
  const query = (String(formData.get("query") ?? "").trim().toLowerCase() || name.toLowerCase()).slice(0, 60)
  if (query.length < 2) adminRedirect({ error: "Add the phrase that should match salon services." })
  const taken = await prisma.serviceGuide.findUnique({ where: { citySlug_slug: { citySlug, slug } } })
  if (taken) adminRedirect({ error: "That service page already exists in this city." })
  const count = await prisma.serviceGuide.count({ where: { citySlug } })
  await prisma.serviceGuide.create({ data: { citySlug, slug, name, query, sortOrder: count, intro: "" } })
  revalidateDirectory()
  revalidatePath(`/${citySlug}/service/${slug}`)
  adminRedirect({ notice: `${name} page added for ${city.name}. It stays out of search until you write an intro.` })
}

export async function saveIntro(formData: FormData) {
  await requireAdmin()
  const kind = String(formData.get("kind") ?? "")
  const id = String(formData.get("id") ?? "")
  const intro = String(formData.get("intro") ?? "").trim().slice(0, 2000)
  if (kind === "city") {
    const city = await prisma.city.update({ where: { slug: id }, data: { intro } }).catch(() => null)
    if (!city) adminRedirect({ error: "That city was not found." })
    revalidatePath(`/${id}`)
  } else if (kind === "locality") {
    const locality = await prisma.locality.update({ where: { id }, data: { intro } }).catch(() => null)
    if (!locality) adminRedirect({ error: "That locality was not found." })
    revalidatePath(`/${locality.citySlug}/${locality.slug}`)
  } else if (kind === "service") {
    const guide = await prisma.serviceGuide.update({ where: { id }, data: { intro } }).catch(() => null)
    if (!guide) adminRedirect({ error: "That service page was not found." })
    revalidatePath(`/${guide.citySlug}/service/${guide.slug}`)
  } else {
    adminRedirect({ error: "Unknown page." })
  }
  revalidateDirectory()
  adminRedirect({ notice: intro ? "Intro saved." : "Intro cleared. This page stays out of search." })
}

export async function updateApprovalMode(formData: FormData) {
  await requireAdmin()
  const required = formData.get("requireApproval") === "on"
  await setRequireApproval(required)
  revalidatePath("/admin")
  adminRedirect({
    notice: required
      ? "New submissions wait for approval."
      : "New submissions go live as soon as the owner submits.",
  })
}

function optionalEmail(value: string) {
  const email = value.trim().toLowerCase()
  if (!email) return { ok: true as const, email: "" }
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: "Enter a valid email." }
  }
  return { ok: true as const, email }
}

async function mintClaim(salonId: string, email: string, phone: string) {
  const token = newMagicToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.claimInvite.create({
    data: { salonId, email, phone, tokenHash: hashMagicToken(token), expiresAt },
  })
  return token
}

export async function createUnclaimedListing(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get("name") ?? "").trim()
  if (name.length < 2 || name.length > 80) adminRedirect({ error: "Add the salon name." })
  const citySlug = String(formData.get("citySlug") ?? "").trim()
  const areaSlug = String(formData.get("areaSlug") ?? "").trim()
  const place = await getLocality(citySlug, areaSlug)
  if (!place) adminRedirect({ error: "Choose a city and locality from the list." })
  const address = String(formData.get("address") ?? "").trim()
  if (address.length < 8 || address.length > 200) adminRedirect({ error: "Add a street address." })
  const gender = String(formData.get("gender") ?? "UNISEX")
  if (!(GENDERS as readonly string[]).includes(gender)) adminRedirect({ error: "Choose who the salon is for." })
  const email = optionalEmail(String(formData.get("email") ?? ""))
  if (!email.ok) adminRedirect({ error: email.error })
  const phone = normalizePhone(String(formData.get("phone") ?? ""), place.city.countryCode, "Phone")
  if (!phone.ok) adminRedirect({ error: phone.error })
  if (!email.email && !phone.value) {
    adminRedirect({ error: "Add an email or a phone number so the owner can claim this." })
  }
  const slug = await uniqueSlug(citySlug, areaSlug, name)
  const salon = await prisma.salon.create({
    data: {
      ownerId: null,
      name,
      slug,
      citySlug,
      areaSlug,
      address,
      gender,
      status: "DRAFT",
      isEarlyPartner: EARLY_PARTNER_PROGRAM,
      hours: { create: defaultHours() },
    },
  })
  await refreshSalonSearch(salon.id)
  const token = await mintClaim(salon.id, email.email, phone.value)
  let mailed = false
  if (email.email && smtpConfigured()) {
    try {
      await sendClaimMail(email.email, salon.name, appUrl(`/partner/claim/${token}`))
      mailed = true
    } catch (error) {
      console.error(error)
    }
  }
  revalidatePath("/admin")
  const notice = mailed
    ? `Listing created for ${salon.name}. The claim link was emailed and is shown below. It expires in 7 days.`
    : `Listing created for ${salon.name}. Copy the claim link below and send it to the owner. It expires in 7 days.`
  adminRedirect({ notice, claim: `/partner/claim/${token}` })
}

export async function resendClaim(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const salon = await prisma.salon.findUnique({
    where: { id },
    include: { claimInvites: { orderBy: { createdAt: "desc" }, take: 1 } },
  })
  if (!salon) adminRedirect({ error: "That listing no longer exists." })
  if (salon.ownerId) adminRedirect({ error: "This listing already has an owner." })
  const previous = salon.claimInvites[0]
  if (!previous || (!previous.email && !previous.phone)) {
    adminRedirect({ error: "This listing has no email or phone to send a claim link to." })
  }
  await prisma.claimInvite.updateMany({
    where: { salonId: salon.id, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  await prisma.claimProof.updateMany({
    where: { invite: { salonId: salon.id }, usedAt: null },
    data: { usedAt: new Date() },
  })
  const token = await mintClaim(salon.id, previous.email, previous.phone)
  let mailed = false
  if (previous.email && smtpConfigured()) {
    try {
      await sendClaimMail(previous.email, salon.name, appUrl(`/partner/claim/${token}`))
      mailed = true
    } catch (error) {
      console.error(error)
    }
  }
  revalidatePath("/admin")
  adminRedirect({
    notice: mailed
      ? `A new claim link for ${salon.name} was emailed and is shown below. Older links no longer work.`
      : `A new claim link for ${salon.name} is below. Older links no longer work.`,
    claim: `/partner/claim/${token}`,
  })
}
