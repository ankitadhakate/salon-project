"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { citySlugError, cleanSlug, localitySlugError } from "@/lib/places"
import { setRequireApproval } from "@/lib/settings"

async function requireAdmin() {
  const user = await getSessionUser()
  if (!user) redirect("/login?next=/admin")
  if (user.role !== "ADMIN") redirect("/")
  return user
}

function adminRedirect(opts: { notice?: string; error?: string }): never {
  const params = new URLSearchParams()
  if (opts.notice) params.set("notice", opts.notice)
  if (opts.error) params.set("error", opts.error)
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
