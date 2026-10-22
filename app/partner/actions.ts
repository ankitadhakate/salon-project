"use server"

import { Prisma } from "@prisma/client"
import { redirect } from "next/navigation"
import {
  createSession,
  getSessionUser,
  hashMagicToken,
  hashPassword,
  verifyPassword,
} from "@/lib/auth"
import { EARLY_PARTNER_PROGRAM, GENDERS } from "@/lib/constants"
import { prisma } from "@/lib/db"
import { getLocality } from "@/lib/places"
import { defaultHours, getOwnerSalon, refreshSalonSearch, uniqueSlug } from "@/lib/salons"
import { SUGGESTED_SERVICES, type SetupStep } from "@/lib/suggested-services"
import { normalizePhone } from "@/lib/validators"

async function requireOwner() {
  const user = await getSessionUser()
  if (!user) redirect("/partner/login?next=/partner/setup")
  if (user.role !== "OWNER" && user.role !== "ADMIN") redirect("/")
  return user
}

function stepRedirect(step: SetupStep, opts: { notice?: string; error?: string }): never {
  const params = new URLSearchParams()
  params.set("step", step)
  if (opts.notice) params.set("notice", opts.notice)
  if (opts.error) params.set("error", opts.error)
  redirect(`/partner/setup?${params.toString()}`)
}

export async function saveSalonStep(formData: FormData) {
  const user = await requireOwner()
  const name = String(formData.get("name") ?? "").trim()
  if (name.length < 2 || name.length > 80) stepRedirect("salon", { error: "Add the salon name." })
  const citySlug = String(formData.get("citySlug") ?? "").trim()
  const areaSlug = String(formData.get("areaSlug") ?? "").trim()
  const place = await getLocality(citySlug, areaSlug)
  if (!place) stepRedirect("salon", { error: "Choose a city and locality from the list." })
  const address = String(formData.get("address") ?? "").trim()
  if (address.length < 8 || address.length > 200) {
    stepRedirect("salon", { error: "Add a street address." })
  }
  const gender = String(formData.get("gender") ?? "")
  if (!(GENDERS as readonly string[]).includes(gender)) {
    stepRedirect("salon", { error: "Choose who the salon is for." })
  }
  const existing = await getOwnerSalon(user.id)
  if (!existing) {
    const slug = await uniqueSlug(citySlug, areaSlug, name)
    const salon = await prisma.salon.create({
      data: {
        ownerId: user.id,
        name,
        slug,
        citySlug,
        areaSlug,
        address,
        gender,
        status: "DRAFT",
        isEarlyPartner: EARLY_PARTNER_PROGRAM,
        referralCode: user.referralCode,
        hours: { create: defaultHours() },
      },
    })
    await refreshSalonSearch(salon.id)
    stepRedirect("contact", { notice: "Salon saved. Add a number customers can message." })
  }
  let slug = existing.slug
  if (existing.citySlug !== citySlug || existing.areaSlug !== areaSlug) {
    slug = await uniqueSlug(citySlug, areaSlug, existing.slug, existing.id)
  }
  await prisma.salon.update({
    where: { id: existing.id },
    data: { name, slug, citySlug, areaSlug, address, gender },
  })
  await refreshSalonSearch(existing.id)
  stepRedirect("contact", { notice: "Salon saved. Add a number customers can message." })
}

export async function saveContactStep(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) stepRedirect("salon", { error: "Add the salon before the contact number." })
  const country = salon.city?.countryCode ?? "IN"
  const whatsappRaw = String(formData.get("whatsapp") ?? "")
  if (!whatsappRaw.trim()) stepRedirect("contact", { error: "Add a WhatsApp number." })
  const whatsapp = normalizePhone(whatsappRaw, country, "WhatsApp")
  if (!whatsapp.ok || !whatsapp.value) {
    stepRedirect("contact", { error: whatsapp.ok ? "Add a WhatsApp number." : whatsapp.error })
  }
  const phone = normalizePhone(String(formData.get("phone") ?? ""), country, "Phone")
  if (!phone.ok) stepRedirect("contact", { error: phone.error })
  await prisma.salon.update({
    where: { id: salon.id },
    data: { whatsapp: whatsapp.value, phone: phone.value },
  })
  await refreshSalonSearch(salon.id)
  stepRedirect("services", { notice: "Contact saved. Tick the services you offer." })
}

export async function saveServicesStep(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) stepRedirect("salon", { error: "Add the salon before the price list." })
  const picks: { name: string; category: string; priceInr: number; durationMin: number; sortOrder: number }[] = []
  SUGGESTED_SERVICES.forEach((service, index) => {
    if (formData.get(`pick-${index}`) !== "on") return
    const raw = String(formData.get(`price-${index}`) ?? "").trim()
    const price = Number(raw || service.priceInr)
    if (!Number.isInteger(price) || price < 1 || price > 500000) {
      stepRedirect("services", { error: `Enter a whole-rupee price for ${service.name}.` })
    }
    picks.push({
      name: service.name,
      category: service.category,
      priceInr: price,
      durationMin: service.durationMin,
      sortOrder: picks.length,
    })
  })
  if (!picks.length) stepRedirect("services", { error: "Tick at least one service." })
  await prisma.service.deleteMany({ where: { salonId: salon.id } })
  await prisma.service.createMany({ data: picks.map((pick) => ({ salonId: salon.id, ...pick })) })
  await refreshSalonSearch(salon.id)
  stepRedirect("photos", { notice: "Prices saved. Add at least 3 photos." })
}

function claimFail(token: string, message: string): never {
  const safe = /^[a-f0-9]{64}$/.test(token) ? token : "invalid"
  redirect(`/partner/claim/${safe}?error=${encodeURIComponent(message)}`)
}

export async function claimSalon(formData: FormData) {
  const token = String(formData.get("token") ?? "")
  if (!/^[a-f0-9]{64}$/.test(token)) claimFail(token, "This claim link is not valid.")
  const invite = await prisma.claimInvite.findUnique({
    where: { tokenHash: hashMagicToken(token) },
    include: { salon: { include: { city: true } } },
  })
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    claimFail(token, "This claim link has expired or was already used.")
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    claimFail(token, "Enter a valid email.")
  }
  if (invite.email && email !== invite.email) {
    claimFail(token, "Use the email this invite was sent to.")
  }
  const country = invite.salon.city?.countryCode ?? "IN"
  const phoneRaw = String(formData.get("phone") ?? "")
  let phone = ""
  if (invite.phone || phoneRaw.trim()) {
    const parsed = normalizePhone(phoneRaw, country, "Phone")
    if (!parsed.ok || !parsed.value) {
      claimFail(token, parsed.ok ? "Enter the phone number on the invite." : parsed.error)
    }
    phone = parsed.value
  }
  if (invite.phone && phone !== invite.phone) {
    claimFail(token, "That phone number doesn't match the invite.")
  }
  const name = String(formData.get("name") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (password.length < 8 || password.length > 72) {
    claimFail(token, "Use a password of at least 8 characters.")
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  let userId = ""
  let role = "OWNER"
  if (existing) {
    if (existing.role !== "OWNER") claimFail(token, "This email belongs to a different kind of account.")
    if (!existing.passwordHash) {
      claimFail(token, "This account has no password yet. Use the partner login email link, then open this claim again.")
    }
    const matches = await verifyPassword(password, existing.passwordHash)
    if (!matches) claimFail(token, "That password doesn't match the account for this email.")
    const owned = await prisma.salon.findUnique({ where: { ownerId: existing.id } })
    if (owned) claimFail(token, "This account already has a listing.")
    userId = existing.id
    role = existing.role
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.salon.findUnique({ where: { id: invite.salonId } })
      const fresh = await tx.claimInvite.findUnique({ where: { id: invite.id } })
      if (!current || current.ownerId || !fresh || fresh.usedAt) throw new Error("claimed")
      if (!userId) {
        if (name.length < 2 || name.length > 80) throw new Error("name")
        const created = await tx.user.create({
          data: { name, email, passwordHash: await hashPassword(password), role: "OWNER" },
        })
        userId = created.id
        role = created.role
      }
      await tx.salon.update({ where: { id: invite.salonId }, data: { ownerId: userId } })
      await tx.claimInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } })
    })
  } catch (error) {
    if (error instanceof Error && error.message === "name") {
      claimFail(token, "Add your name.")
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      claimFail(token, "That email is already registered. Enter the password for it.")
    }
    claimFail(token, "This listing was just claimed. Log in if it was you.")
  }
  await createSession(userId, role)
  redirect("/partner?notice=" + encodeURIComponent("You claimed the listing. Edit it, then submit it for review."))
}
