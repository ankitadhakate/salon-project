"use server"

import { randomInt } from "node:crypto"
import { redirect } from "next/navigation"
import {
  createSession,
  getSessionUser,
  hashMagicToken,
  hashPassword,
  newMagicToken,
  verifyPassword,
} from "@/lib/auth"
import { ClaimError, completeClaimByCode } from "@/lib/claim"
import { sendClaimCodeMail, smtpConfigured } from "@/lib/mail"
import { actionClientIp, limitClaim } from "@/lib/rate-limit"
import { auditListing, reviewNotice } from "@/lib/review"
import { appUrl } from "@/lib/urls"
import { EARLY_PARTNER_PROGRAM, GENDERS } from "@/lib/constants"
import { prisma } from "@/lib/db"
import { getLocality } from "@/lib/places"
import { defaultHours, getOwnerSalon, refreshSalonSearch, uniqueSlug } from "@/lib/salons"
import { SUGGESTED_SERVICES, type SetupStep } from "@/lib/suggested-services"
import { parsePin } from "@/lib/geo"
import { readMapsUrl } from "@/lib/maps-link"
import { normalizePhone } from "@/lib/validators"

async function requireOwner() {
  const user = await getSessionUser()
  if (!user) redirect("/partner/login?next=/partner/setup")
  if (user.role !== "OWNER" && user.role !== "ADMIN") redirect("/")
  return user
}

function stepRedirect(step: SetupStep, opts: { notice?: string; error?: string; field?: string }): never {
  const params = new URLSearchParams()
  params.set("step", step)
  if (opts.notice) params.set("notice", opts.notice)
  if (opts.error) params.set("error", opts.error)
  if (opts.field && /^[a-zA-Z]+$/.test(opts.field)) params.set("field", opts.field)
  redirect(`/partner/setup?${params.toString()}`)
}

export async function saveSalonStep(formData: FormData) {
  const user = await requireOwner()
  const name = String(formData.get("name") ?? "").trim()
  if (name.length < 2 || name.length > 80) stepRedirect("salon", { error: "Add the salon name.", field: "name" })
  const citySlug = String(formData.get("citySlug") ?? "").trim()
  const areaSlug = String(formData.get("areaSlug") ?? "").trim()
  const place = await getLocality(citySlug, areaSlug)
  if (!place) stepRedirect("salon", { error: "Choose a city and locality from the list.", field: "areaSlug" })
  const address = String(formData.get("address") ?? "").trim()
  if (address.length < 8 || address.length > 200) {
    stepRedirect("salon", { error: "Add a street address.", field: "address" })
  }
  const gender = String(formData.get("gender") ?? "")
  if (!(GENDERS as readonly string[]).includes(gender)) {
    stepRedirect("salon", { error: "Choose who the salon is for.", field: "gender" })
  }
  const pin = parsePin(formData, true)
  if (!pin.ok || pin.empty) {
    stepRedirect("salon", {
      error: pin.ok ? "Search the address and drop the pin on the salon." : pin.error,
      field: "latitude",
    })
  }
  const maps = readMapsUrl(formData)
  if (!maps.ok) stepRedirect("salon", { error: maps.error, field: "latitude" })
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
        latitude: pin.latitude,
        longitude: pin.longitude,
        mapsUrl: maps.value,
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
    data: {
      name,
      slug,
      citySlug,
      areaSlug,
      address,
      gender,
      latitude: pin.latitude,
      longitude: pin.longitude,
      mapsUrl: maps.value,
    },
  })
  const review = await auditListing({
    salonId: existing.id,
    actorId: user.id,
    status: existing.status,
    sensitive: existing.name !== name,
    changes: [
      { field: "name", oldValue: existing.name, newValue: name },
      { field: "address", oldValue: existing.address, newValue: address },
      { field: "city", oldValue: existing.citySlug, newValue: citySlug },
      { field: "area", oldValue: existing.areaSlug, newValue: areaSlug },
      { field: "gender", oldValue: existing.gender, newValue: gender },
      { field: "mapsUrl", oldValue: existing.mapsUrl ?? "", newValue: maps.value ?? "" },
    ],
  })
  await refreshSalonSearch(existing.id)
  stepRedirect("contact", {
    notice: reviewNotice("Salon saved. Add a number customers can message.", review.queued),
  })
}

export async function saveContactStep(formData: FormData) {
  const user = await requireOwner()
  const salon = await getOwnerSalon(user.id)
  if (!salon) stepRedirect("salon", { error: "Add the salon before the contact number." })
  const country = salon.city?.countryCode ?? "IN"
  const whatsappRaw = String(formData.get("whatsapp") ?? "")
  if (!whatsappRaw.trim()) stepRedirect("contact", { error: "Add a WhatsApp number.", field: "whatsapp" })
  const whatsapp = normalizePhone(whatsappRaw, country, "WhatsApp")
  if (!whatsapp.ok || !whatsapp.value) {
    stepRedirect("contact", { error: whatsapp.ok ? "Add a WhatsApp number." : whatsapp.error, field: "whatsapp" })
  }
  const phone = normalizePhone(String(formData.get("phone") ?? ""), country, "Phone")
  if (!phone.ok) stepRedirect("contact", { error: phone.error, field: "phone" })
  await prisma.salon.update({
    where: { id: salon.id },
    data: { whatsapp: whatsapp.value, phone: phone.value },
  })
  const review = await auditListing({
    salonId: salon.id,
    actorId: user.id,
    status: salon.status,
    sensitive: salon.phone !== phone.value || salon.whatsapp !== whatsapp.value,
    changes: [
      { field: "whatsapp", oldValue: salon.whatsapp, newValue: whatsapp.value },
      { field: "phone", oldValue: salon.phone, newValue: phone.value },
    ],
  })
  await refreshSalonSearch(salon.id)
  stepRedirect("services", {
    notice: reviewNotice("Contact saved. Tick the services you offer.", review.queued),
  })
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
      stepRedirect("services", { error: `Enter a whole-rupee price for ${service.name}.`, field: "services" })
    }
    picks.push({
      name: service.name,
      category: service.category,
      priceInr: price,
      durationMin: service.durationMin,
      sortOrder: picks.length,
    })
  })
  if (!picks.length) stepRedirect("services", { error: "Tick at least one service.", field: "services" })
  const before = salon.services.map((service) => `${service.category}:${service.name}:${service.priceInr}`).join(", ")
  const suggested = new Set(SUGGESTED_SERVICES.map((service) => `${service.category}:${service.name}`))
  const picked = new Set(picks.map((pick) => `${pick.category}:${pick.name}`))
  for (const pick of picks) {
    const found = salon.services.find((service) => service.category === pick.category && service.name === pick.name)
    if (!found) {
      await prisma.service.create({ data: { salonId: salon.id, ...pick } })
      continue
    }
    if (found.priceInr !== pick.priceInr) {
      await prisma.service.update({
        where: { id: found.id },
        data: { priceInr: pick.priceInr, durationMin: pick.durationMin, sortOrder: pick.sortOrder },
      })
    } else if (found.durationMin !== pick.durationMin || found.sortOrder !== pick.sortOrder) {
      await prisma.$executeRaw`
        UPDATE "Service"
        SET "durationMin" = ${pick.durationMin}, "sortOrder" = ${pick.sortOrder}
        WHERE "id" = ${found.id}
      `
    }
  }
  const dropped = salon.services.filter(
    (service) =>
      suggested.has(`${service.category}:${service.name}`) && !picked.has(`${service.category}:${service.name}`),
  )
  if (dropped.length) {
    await prisma.service.deleteMany({ where: { id: { in: dropped.map((service) => service.id) } } })
  }
  const review = await auditListing({
    salonId: salon.id,
    actorId: user.id,
    status: salon.status,
    sensitive: false,
    changes: [
      {
        field: "services",
        oldValue: before,
        newValue: picks.map((pick) => `${pick.category}:${pick.name}:${pick.priceInr}`).join(", "),
      },
    ],
  })
  await refreshSalonSearch(salon.id)
  stepRedirect("photos", { notice: reviewNotice("Prices saved. Add at least 3 photos.", review.queued) })
}

function claimFail(token: string, message: string): never {
  const safe = /^[a-f0-9]{64}$/.test(token) ? token : "invalid"
  redirect(`/partner/claim/${safe}?error=${encodeURIComponent(message)}`)
}

function devClaim() {
  return process.env.NODE_ENV !== "production"
}

export async function claimSalon(formData: FormData) {
  const token = String(formData.get("token") ?? "")
  if (!/^[a-f0-9]{64}$/.test(token)) claimFail(token, "This claim link is not valid.")
  const allowed = await limitClaim(await actionClientIp(), token)
  if (!allowed) claimFail(token, "Too many attempts. Wait an hour and try again.")
  const invite = await prisma.claimInvite.findUnique({
    where: { tokenHash: hashMagicToken(token) },
    include: { salon: { include: { city: true } } },
  })
  if (!invite || invite.usedAt || invite.revokedAt || invite.expiresAt < new Date() || invite.salon.ownerId) {
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
  let userId: string | null = null
  let passwordHash = ""
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
  } else {
    if (name.length < 2 || name.length > 80) claimFail(token, "Add your name.")
    passwordHash = await hashPassword(password)
  }

  if (!invite.email) {
    const locked = await prisma.claimInvite.updateMany({
      where: { id: invite.id, email: "", usedAt: null, revokedAt: null },
      data: { email },
    })
    if (locked.count !== 1) {
      const fresh = await prisma.claimInvite.findUnique({ where: { id: invite.id } })
      if (!fresh || fresh.email !== email) claimFail(token, "Use the email this invite was sent to.")
    }
  }

  if (!smtpConfigured() && !devClaim()) {
    claimFail(token, "Email isn't configured, so this claim can't be confirmed. Ask the site admin to set SMTP.")
  }

  const proofToken = newMagicToken()
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  await prisma.claimProof.updateMany({
    where: { inviteId: invite.id, usedAt: null },
    data: { usedAt: new Date() },
  })
  await prisma.claimProof.create({
    data: {
      inviteId: invite.id,
      email,
      name: userId ? "" : name,
      passwordHash,
      phone,
      userId,
      tokenHash: hashMagicToken(proofToken),
      codeHash: hashMagicToken(code),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  })
  const proofPath = `/partner/claim/verify?token=${proofToken}`
  if (smtpConfigured()) {
    try {
      await sendClaimCodeMail(email, invite.salon.name, appUrl(proofPath), code)
    } catch (error) {
      console.error(error)
      await prisma.claimProof.updateMany({
        where: { tokenHash: hashMagicToken(proofToken), usedAt: null },
        data: { usedAt: new Date() },
      })
      claimFail(token, "We couldn't send the confirmation email. Try again in a few minutes.")
    }
  }

  const params = new URLSearchParams()
  params.set("sent", "1")
  if (devClaim() && !smtpConfigured()) {
    params.set("dev", proofPath)
    params.set("code", code)
  }
  redirect(`/partner/claim/${token}?${params.toString()}`)
}

export async function confirmClaim(formData: FormData) {
  const token = String(formData.get("token") ?? "")
  if (!/^[a-f0-9]{64}$/.test(token)) claimFail(token, "This claim link is not valid.")
  const allowed = await limitClaim(await actionClientIp(), token)
  if (!allowed) claimFail(token, "Too many attempts. Wait an hour and try again.")
  const invite = await prisma.claimInvite.findUnique({
    where: { tokenHash: hashMagicToken(token) },
  })
  if (!invite || invite.usedAt || invite.revokedAt || invite.expiresAt < new Date()) {
    claimFail(token, "This claim link has expired or was already used.")
  }
  const code = String(formData.get("code") ?? "").replace(/\D/g, "")
  try {
    const user = await completeClaimByCode(invite.id, code)
    await createSession(user.userId, user.role)
  } catch (error) {
    const message = error instanceof ClaimError ? error.message : "That code doesn't match."
    const params = new URLSearchParams()
    params.set("sent", "1")
    params.set("error", message)
    redirect(`/partner/claim/${token}?${params.toString()}`)
  }
  redirect("/partner?notice=" + encodeURIComponent("You claimed the listing. Edit it, then submit it for review."))
}
