"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSessionUser, hashPassword } from "@/lib/auth"
import { EARLY_PARTNER_PROGRAM, MAX_PHOTOS, MAX_SERVICES } from "@/lib/constants"
import { prisma } from "@/lib/db"
import {
  defaultHours,
  getOwnerSalon,
  refreshSalonSearch,
  uniqueSlug,
} from "@/lib/salons"
import { getRequireApproval } from "@/lib/settings"
import { auditListing, reviewNotice } from "@/lib/review"
import { getImageStorage, ImageStorageError } from "@/lib/storage"
import { getLocality } from "@/lib/places"
import { parsePin } from "@/lib/geo"
import { readMapsUrl } from "@/lib/maps-link"
import { normalizePhone, parseHours, parsePassword, parseProfile, parseService } from "@/lib/validators"

async function requireOwner() {
  const user = await getSessionUser()
  if (!user) redirect("/partner/login?next=/partner")
  if (user.role !== "OWNER" && user.role !== "ADMIN") redirect("/")
  return user
}

function dashRedirect(opts: { notice?: string; error?: string; setup?: boolean }): never {
  const params = new URLSearchParams()
  if (opts.setup) params.set("step", "photos")
  if (opts.notice) params.set("notice", opts.notice)
  if (opts.error) params.set("error", opts.error)
  redirect(`${opts.setup ? "/partner/setup" : "/partner/edit"}?${params.toString()}`)
}

function wantsSetup(formData?: FormData) {
  return Boolean(formData && String(formData.get("next") ?? "") === "setup")
}

function touchPublic(citySlug: string, areaSlug: string, slug: string) {
  revalidatePath("/")
  revalidatePath(`/${citySlug}`)
  revalidatePath(`/${citySlug}/${areaSlug}`)
  revalidatePath(`/${citySlug}/${areaSlug}/${slug}`)
  revalidatePath(`/${citySlug}/service`)
  revalidatePath("/sitemap.xml")
  revalidatePath("/admin")
  revalidatePath("/dashboard")
  revalidatePath("/partner")
  revalidatePath("/partner/edit")
}

export async function saveProfile(formData: FormData) {
  const user = await requireOwner()
  const parsed = parseProfile(formData)
  if (!parsed.ok) dashRedirect({ error: parsed.error })
  const place = await getLocality(parsed.data.citySlug, parsed.data.areaSlug)
  if (!place) dashRedirect({ error: "Choose a city and locality from the list." })
  const phone = normalizePhone(parsed.data.phone, place.city.countryCode, "Phone")
  if (!phone.ok) dashRedirect({ error: phone.error })
  const whatsapp = normalizePhone(parsed.data.whatsapp, place.city.countryCode, "WhatsApp")
  if (!whatsapp.ok) dashRedirect({ error: whatsapp.error })
  const profile = { ...parsed.data, phone: phone.value, whatsapp: whatsapp.value }
  const pin = parsePin(formData, false)
  if (!pin.ok) dashRedirect({ error: pin.error })
  const maps = readMapsUrl(formData)
  if (!maps.ok) dashRedirect({ error: maps.error })
  const coordinates = pin.empty ? {} : { latitude: pin.latitude, longitude: pin.longitude }
  const existing = await getOwnerSalon(user.id)

  if (!existing) {
    const slug = await uniqueSlug(profile.citySlug, profile.areaSlug, profile.name)
    const salon = await prisma.salon.create({
      data: {
        ownerId: user.id,
        name: profile.name,
        slug,
        citySlug: profile.citySlug,
        areaSlug: profile.areaSlug,
        address: profile.address,
        ...coordinates,
        mapsUrl: maps.value,
        description: profile.description,
        gender: profile.gender,
        phone: profile.phone,
        whatsapp: profile.whatsapp,
        status: "DRAFT",
        isEarlyPartner: EARLY_PARTNER_PROGRAM,
        referralCode: user.referralCode,
        hours: { create: defaultHours() },
      },
    })
    await refreshSalonSearch(salon.id)
    touchPublic(salon.citySlug, salon.areaSlug, salon.slug)
    dashRedirect({ notice: "Listing started. Add services, hours, and photos next." })
  }

  let slug = existing.slug
  if (existing.citySlug !== profile.citySlug || existing.areaSlug !== profile.areaSlug) {
    slug = await uniqueSlug(profile.citySlug, profile.areaSlug, existing.slug, existing.id)
  }
  const salon = await prisma.salon.update({
    where: { id: existing.id },
    data: {
      name: profile.name,
      slug,
      citySlug: profile.citySlug,
      areaSlug: profile.areaSlug,
      address: profile.address,
      ...coordinates,
      mapsUrl: maps.value,
      description: profile.description,
      gender: profile.gender,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
    },
  })
  const review = await auditListing({
    salonId: salon.id,
    actorId: user.id,
    status: existing.status,
    sensitive:
      existing.name !== profile.name ||
      existing.phone !== profile.phone ||
      existing.whatsapp !== profile.whatsapp,
    changes: [
      { field: "name", oldValue: existing.name, newValue: profile.name },
      { field: "phone", oldValue: existing.phone, newValue: profile.phone },
      { field: "whatsapp", oldValue: existing.whatsapp, newValue: profile.whatsapp },
      { field: "address", oldValue: existing.address, newValue: profile.address },
      { field: "description", oldValue: existing.description, newValue: profile.description },
      { field: "gender", oldValue: existing.gender, newValue: profile.gender },
      { field: "city", oldValue: existing.citySlug, newValue: profile.citySlug },
      { field: "area", oldValue: existing.areaSlug, newValue: profile.areaSlug },
      {
        field: "latitude",
        oldValue: existing.latitude == null ? "" : String(existing.latitude),
        newValue: pin.empty ? (existing.latitude == null ? "" : String(existing.latitude)) : String(pin.latitude),
      },
      {
        field: "longitude",
        oldValue: existing.longitude == null ? "" : String(existing.longitude),
        newValue: pin.empty ? (existing.longitude == null ? "" : String(existing.longitude)) : String(pin.longitude),
      },
      { field: "mapsUrl", oldValue: existing.mapsUrl ?? "", newValue: maps.value ?? "" },
    ],
  })
  await refreshSalonSearch(salon.id)
  touchPublic(existing.citySlug, existing.areaSlug, existing.slug)
  touchPublic(salon.citySlug, salon.areaSlug, salon.slug)
  dashRedirect({ notice: reviewNotice("Salon details saved.", review.queued) })
}

export async function addService(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  const parsed = parseService(formData)
  if (!parsed.ok) dashRedirect({ error: parsed.error })
  const count = await prisma.service.count({ where: { salonId: salon.id } })
  if (count >= MAX_SERVICES) dashRedirect({ error: `List up to ${MAX_SERVICES} services.` })
  await prisma.service.create({
    data: { salonId: salon.id, ...parsed.data, sortOrder: count },
  })
  const review = await auditListing({
    salonId: salon.id,
    actorId: user.id,
    status: salon.status,
    sensitive: false,
    changes: [{ field: "service", oldValue: "", newValue: `${parsed.data.name} ${parsed.data.priceInr}` }],
  })
  await refreshSalonSearch(salon.id)
  touchPublic(salon.citySlug, salon.areaSlug, salon.slug)
  dashRedirect({ notice: reviewNotice("Service added.", review.queued) })
}

export async function updateService(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  const id = String(formData.get("id") ?? "")
  const service = await prisma.service.findFirst({ where: { id, salonId: salon.id } })
  if (!service) dashRedirect({ error: "That service is not on your listing." })
  const parsed = parseService(formData)
  if (!parsed.ok) dashRedirect({ error: parsed.error })
  await prisma.service.update({ where: { id }, data: parsed.data })
  const review = await auditListing({
    salonId: salon.id,
    actorId: user.id,
    status: salon.status,
    sensitive: false,
    changes: [
      {
        field: "service",
        oldValue: `${service.name} ${service.priceInr} ${service.durationMin} ${service.category}`,
        newValue: `${parsed.data.name} ${parsed.data.priceInr} ${parsed.data.durationMin} ${parsed.data.category}`,
      },
    ],
  })
  await refreshSalonSearch(salon.id)
  touchPublic(salon.citySlug, salon.areaSlug, salon.slug)
  dashRedirect({ notice: reviewNotice("Service updated.", review.queued) })
}

export async function deleteService(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  const id = String(formData.get("id") ?? "")
  const service = await prisma.service.findFirst({ where: { id, salonId: salon.id } })
  if (!service) dashRedirect({ error: "That service is not on your listing." })
  await prisma.service.delete({ where: { id } })
  const review = await auditListing({
    salonId: salon.id,
    actorId: user.id,
    status: salon.status,
    sensitive: false,
    changes: [{ field: "service", oldValue: `${service.name} ${service.priceInr}`, newValue: "" }],
  })
  await refreshSalonSearch(salon.id)
  touchPublic(salon.citySlug, salon.areaSlug, salon.slug)
  dashRedirect({ notice: reviewNotice("Service removed.", review.queued) })
}

export async function saveHours(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  const parsed = parseHours(formData)
  if (!parsed.ok) dashRedirect({ error: parsed.error })
  const before = [...salon.hours]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((row) => `${row.dayOfWeek}:${row.closed ? "closed" : `${row.openTime}-${row.closeTime}`}`)
    .join(",")
  for (const row of parsed.rows) {
    await prisma.openingHour.upsert({
      where: { salonId_dayOfWeek: { salonId: salon.id, dayOfWeek: row.dayOfWeek } },
      create: { salonId: salon.id, ...row },
      update: row,
    })
  }
  const after = [...parsed.rows]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((row) => `${row.dayOfWeek}:${row.closed ? "closed" : `${row.openTime}-${row.closeTime}`}`)
    .join(",")
  const review = await auditListing({
    salonId: salon.id,
    actorId: user.id,
    status: salon.status,
    sensitive: false,
    changes: [{ field: "hours", oldValue: before, newValue: after }],
  })
  touchPublic(salon.citySlug, salon.areaSlug, salon.slug)
  dashRedirect({ notice: reviewNotice("Opening hours saved.", review.queued) })
}

export async function uploadPhotos(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  const files = formData
    .getAll("photos")
    .filter((file): file is File => file instanceof File && file.size > 0)
  if (!files.length) dashRedirect({ error: "Choose a photo first.", setup: wantsSetup(formData) })
  if (files.length > 1) {
    dashRedirect({
      error: `Upload one photo at a time. Nothing was saved (${files.map((file) => file.name).slice(0, 4).join(", ")}).`,
      setup: wantsSetup(formData),
    })
  }
  if (salon.photos.length + 1 > MAX_PHOTOS) {
    dashRedirect({ error: `You can add up to ${MAX_PHOTOS} photos.`, setup: wantsSetup(formData) })
  }
  const file = files[0]
  if (!file) dashRedirect({ error: "Choose a photo first.", setup: wantsSetup(formData) })
  const caption = String(formData.get("caption") ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80)
  const storage = getImageStorage()
  const order = salon.photos.reduce((max, photo) => Math.max(max, photo.sortOrder), -1) + 1
  let stored: { url: string; key: string }
  try {
    stored = await storage.save(file)
  } catch (error) {
    const label = file.name.slice(0, 80) || "That file"
    if (error instanceof ImageStorageError) {
      dashRedirect({ error: `${label}: ${error.message} Nothing was saved.`, setup: wantsSetup(formData) })
    }
    console.error(error)
    dashRedirect({ error: `${label}: couldn't upload that photo. Nothing was saved.`, setup: wantsSetup(formData) })
  }
  try {
    await prisma.photo.create({
      data: {
        salonId: salon.id,
        url: stored.url,
        storageKey: stored.key,
        alt: caption || `${salon.name} photo`,
        sortOrder: order,
      },
    })
  } catch (error) {
    await storage.remove(stored.key)
    console.error(error)
    dashRedirect({ error: "Couldn't save that photo. Nothing was kept.", setup: wantsSetup(formData) })
  }
  const review = await auditListing({
    salonId: salon.id,
    actorId: user.id,
    status: salon.status,
    sensitive: true,
    changes: [{ field: "photo", oldValue: "", newValue: "added" }],
  })
  touchPublic(salon.citySlug, salon.areaSlug, salon.slug)
  dashRedirect({
    notice: reviewNotice("Photo added.", review.queued),
    setup: wantsSetup(formData),
  })
}

export async function deletePhoto(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  const id = String(formData.get("id") ?? "")
  const photo = await prisma.photo.findFirst({ where: { id, salonId: salon.id } })
  if (!photo) dashRedirect({ error: "That photo is not on your listing." })
  if ((salon.status === "LIVE" || salon.status === "PENDING") && salon.photos.length <= 3) {
    dashRedirect({
      error: "Keep at least 3 photos. Add another photo before you remove this one.",
    })
  }
  await getImageStorage().remove(photo.storageKey)
  await prisma.photo.delete({ where: { id } })
  const review = await auditListing({
    salonId: salon.id,
    actorId: user.id,
    status: salon.status,
    sensitive: true,
    changes: [{ field: "photo", oldValue: photo.alt || photo.url, newValue: "removed" }],
  })
  touchPublic(salon.citySlug, salon.areaSlug, salon.slug)
  dashRedirect({ notice: reviewNotice("Photo removed.", review.queued) })
}

export async function makeCover(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  const id = String(formData.get("id") ?? "")
  const photo = await prisma.photo.findFirst({ where: { id, salonId: salon.id } })
  if (!photo) dashRedirect({ error: "That photo is not on your listing." })
  const min = Math.min(...salon.photos.map((item) => item.sortOrder))
  await prisma.photo.update({ where: { id }, data: { sortOrder: min - 1 } })
  const review = await auditListing({
    salonId: salon.id,
    actorId: user.id,
    status: salon.status,
    sensitive: true,
    changes: [{ field: "photo", oldValue: "cover", newValue: photo.alt || photo.id }],
  })
  touchPublic(salon.citySlug, salon.areaSlug, salon.slug)
  dashRedirect({ notice: reviewNotice("Cover photo updated.", review.queued) })
}

export async function submitListing(formData?: FormData) {
  const user = await requireOwner()
  const setup = wantsSetup(formData)
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first.", setup })
  if (salon.name.trim().length < 2 || salon.address.trim().length < 8) {
    dashRedirect({ error: "Add the salon name and address before submitting.", setup })
  }
  if (!salon.whatsapp) {
    dashRedirect({ error: "Add a WhatsApp number so customers can reach you.", setup })
  }
  if (salon.services.length === 0) {
    dashRedirect({ error: "Add at least one service with a price.", setup })
  }
  if (salon.photos.length < 3) {
    dashRedirect({ error: "Add at least 3 photos before you submit.", setup })
  }
  if (salon.status === "LIVE") {
    dashRedirect({
      notice:
        "This listing is already live. Customers can see it. Name, phone, WhatsApp, and photo changes wait for a review.",
    })
  }
  const requireApproval = await getRequireApproval()
  const status = requireApproval ? "PENDING" : "LIVE"
  await prisma.salon.update({ where: { id: salon.id }, data: { status } })
  touchPublic(salon.citySlug, salon.areaSlug, salon.slug)
  const notice = requireApproval
    ? "Submitted. It waits in the review queue before customers can see it."
    : "Your listing is live."
  if (setup) redirect(`/partner?notice=${encodeURIComponent(notice)}`)
  dashRedirect({ notice })
}

export async function setPassword(formData: FormData) {
  const user = await requireOwner()
  const parsed = parsePassword(formData)
  if (!parsed.ok) dashRedirect({ error: parsed.error })
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.password) },
  })
  dashRedirect({ notice: "Password saved. You can use it next time you log in." })
}
