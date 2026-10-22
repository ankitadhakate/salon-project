"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getSessionUser, hashPassword } from "@/lib/auth"
import { EARLY_PARTNER_PROGRAM, MAX_PHOTOS } from "@/lib/constants"
import { prisma } from "@/lib/db"
import {
  defaultHours,
  getOwnerSalon,
  refreshSalonSearch,
  uniqueSlug,
} from "@/lib/salons"
import { getRequireApproval } from "@/lib/settings"
import { getImageStorage, ImageStorageError } from "@/lib/storage"
import { parseHours, parsePassword, parseProfile, parseService } from "@/lib/validators"

async function requireOwner() {
  const user = await getSessionUser()
  if (!user) redirect("/login?next=/dashboard")
  return user
}

function dashRedirect(opts: { notice?: string; error?: string }): never {
  const params = new URLSearchParams()
  if (opts.notice) params.set("notice", opts.notice)
  if (opts.error) params.set("error", opts.error)
  redirect(`/dashboard?${params.toString()}`)
}

function touchPublic(areaSlug: string, slug: string) {
  revalidatePath("/")
  revalidatePath("/pune")
  revalidatePath(`/pune/${areaSlug}`)
  revalidatePath(`/pune/${areaSlug}/${slug}`)
  revalidatePath("/sitemap.xml")
  revalidatePath("/admin")
  revalidatePath("/dashboard")
}

export async function saveProfile(formData: FormData) {
  const user = await requireOwner()
  const parsed = parseProfile(formData)
  if (!parsed.ok) dashRedirect({ error: parsed.error })
  const existing = await getOwnerSalon(user.id)

  if (!existing) {
    const slug = await uniqueSlug(parsed.data.areaSlug, parsed.data.name)
    const salon = await prisma.salon.create({
      data: {
        ownerId: user.id,
        name: parsed.data.name,
        slug,
        areaSlug: parsed.data.areaSlug,
        address: parsed.data.address,
        description: parsed.data.description,
        gender: parsed.data.gender,
        phone: parsed.data.phone,
        whatsapp: parsed.data.whatsapp,
        status: "DRAFT",
        isEarlyPartner: EARLY_PARTNER_PROGRAM,
        referralCode: user.referralCode,
        hours: { create: defaultHours() },
      },
    })
    await refreshSalonSearch(salon.id)
    touchPublic(salon.areaSlug, salon.slug)
    dashRedirect({ notice: "Listing started. Add services, hours, and photos next." })
  }

  let slug = existing.slug
  if (existing.areaSlug !== parsed.data.areaSlug) {
    slug = await uniqueSlug(parsed.data.areaSlug, existing.slug, existing.id)
  }
  const salon = await prisma.salon.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      slug,
      areaSlug: parsed.data.areaSlug,
      address: parsed.data.address,
      description: parsed.data.description,
      gender: parsed.data.gender,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp,
    },
  })
  await refreshSalonSearch(salon.id)
  touchPublic(existing.areaSlug, existing.slug)
  touchPublic(salon.areaSlug, salon.slug)
  dashRedirect({ notice: "Salon details saved." })
}

export async function addService(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  const parsed = parseService(formData)
  if (!parsed.ok) dashRedirect({ error: parsed.error })
  const count = await prisma.service.count({ where: { salonId: salon.id } })
  await prisma.service.create({
    data: { salonId: salon.id, ...parsed.data, sortOrder: count },
  })
  await refreshSalonSearch(salon.id)
  touchPublic(salon.areaSlug, salon.slug)
  dashRedirect({ notice: "Service added." })
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
  await refreshSalonSearch(salon.id)
  touchPublic(salon.areaSlug, salon.slug)
  dashRedirect({ notice: "Service updated." })
}

export async function deleteService(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  const id = String(formData.get("id") ?? "")
  const service = await prisma.service.findFirst({ where: { id, salonId: salon.id } })
  if (!service) dashRedirect({ error: "That service is not on your listing." })
  await prisma.service.delete({ where: { id } })
  await refreshSalonSearch(salon.id)
  touchPublic(salon.areaSlug, salon.slug)
  dashRedirect({ notice: "Service removed." })
}

export async function saveHours(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  const parsed = parseHours(formData)
  if (!parsed.ok) dashRedirect({ error: parsed.error })
  for (const row of parsed.rows) {
    await prisma.openingHour.upsert({
      where: { salonId_dayOfWeek: { salonId: salon.id, dayOfWeek: row.dayOfWeek } },
      create: { salonId: salon.id, ...row },
      update: row,
    })
  }
  touchPublic(salon.areaSlug, salon.slug)
  dashRedirect({ notice: "Opening hours saved." })
}

export async function uploadPhotos(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  const files = formData
    .getAll("photos")
    .filter((file): file is File => file instanceof File && file.size > 0)
  if (!files.length) dashRedirect({ error: "Choose a photo first." })
  if (salon.photos.length + files.length > MAX_PHOTOS) {
    dashRedirect({ error: `You can add up to ${MAX_PHOTOS} photos.` })
  }
  const storage = getImageStorage()
  let order = salon.photos.reduce((max, photo) => Math.max(max, photo.sortOrder), -1) + 1
  try {
    for (const file of files) {
      const stored = await storage.save(file)
      await prisma.photo.create({
        data: {
          salonId: salon.id,
          url: stored.url,
          storageKey: stored.key,
          alt: `${salon.name} photo`,
          sortOrder: order,
        },
      })
      order += 1
    }
  } catch (error) {
    if (error instanceof ImageStorageError) dashRedirect({ error: error.message })
    console.error(error)
    dashRedirect({ error: "Couldn't upload that photo." })
  }
  touchPublic(salon.areaSlug, salon.slug)
  dashRedirect({ notice: files.length === 1 ? "Photo added." : "Photos added." })
}

export async function deletePhoto(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  const id = String(formData.get("id") ?? "")
  const photo = await prisma.photo.findFirst({ where: { id, salonId: salon.id } })
  if (!photo) dashRedirect({ error: "That photo is not on your listing." })
  await getImageStorage().remove(photo.storageKey)
  await prisma.photo.delete({ where: { id } })
  touchPublic(salon.areaSlug, salon.slug)
  dashRedirect({ notice: "Photo removed." })
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
  touchPublic(salon.areaSlug, salon.slug)
  dashRedirect({ notice: "Cover photo updated." })
}

export async function submitListing() {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) dashRedirect({ error: "Save your salon details first." })
  if (salon.name.trim().length < 2 || salon.address.trim().length < 8) {
    dashRedirect({ error: "Add the salon name and address before submitting." })
  }
  if (!salon.whatsapp) {
    dashRedirect({ error: "Add a WhatsApp number so customers can reach you." })
  }
  if (salon.services.length === 0) {
    dashRedirect({ error: "Add at least one service with a price." })
  }
  if (salon.status === "LIVE") {
    dashRedirect({ notice: "This listing is already live. Edits show on the public page." })
  }
  const requireApproval = await getRequireApproval()
  const status = requireApproval ? "PENDING" : "LIVE"
  await prisma.salon.update({ where: { id: salon.id }, data: { status } })
  touchPublic(salon.areaSlug, salon.slug)
  dashRedirect({
    notice: requireApproval
      ? "Submitted. A reviewer will make it public after a quick check."
      : "Your listing is live.",
  })
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
