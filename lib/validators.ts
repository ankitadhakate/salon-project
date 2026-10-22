import { z } from "zod"
import { GENDERS, SERVICE_CATEGORIES } from "@/lib/constants"

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again."
}

export function normalizeIndianMobile(input: string) {
  let digits = input.replace(/\D/g, "")
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1)
  if (!/^[6-9]\d{9}$/.test(digits)) return null
  return digits
}

const referralSchema = z
  .string()
  .trim()
  .max(32, "Referral codes are at most 32 characters.")
  .regex(/^[A-Za-z0-9-]*$/, "Referral codes use letters, numbers, and hyphens.")

export function parseSignup(formData: FormData) {
  const schema = z.object({
    name: z.string().trim().min(2, "Add your name.").max(80, "That name is too long."),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email.")),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Use 72 characters or fewer."),
    referralCode: referralSchema,
  })
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    referralCode: String(formData.get("referralCode") ?? ""),
  })
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) }
  return {
    ok: true as const,
    data: {
      ...parsed.data,
      referralCode: parsed.data.referralCode ? parsed.data.referralCode.toUpperCase() : null,
    },
  }
}

export function parseLogin(formData: FormData) {
  const schema = z.object({
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email.")),
    password: z.string().min(1, "Enter your password.").max(72),
  })
  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  })
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) }
  return { ok: true as const, data: parsed.data }
}

export function parseMagicSignup(formData: FormData) {
  const schema = z.object({
    name: z.string().trim().min(2, "Add your name.").max(80),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email.")),
    referralCode: referralSchema,
  })
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    referralCode: String(formData.get("referralCode") ?? ""),
  })
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) }
  return {
    ok: true as const,
    data: {
      ...parsed.data,
      referralCode: parsed.data.referralCode ? parsed.data.referralCode.toUpperCase() : null,
    },
  }
}

export function parseEmail(formData: FormData) {
  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email."))
    .safeParse(String(formData.get("email") ?? ""))
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) }
  return { ok: true as const, email: parsed.data }
}

export function normalizePhone(input: string, countryCode: string, label: string) {
  const trimmed = input.trim()
  if (!trimmed) return { ok: true as const, value: "" }
  if (countryCode === "IN") {
    const value = normalizeIndianMobile(trimmed)
    if (!value) {
      return { ok: false as const, error: `${label} should be a 10-digit mobile number.` }
    }
    return { ok: true as const, value }
  }
  const digits = trimmed.replace(/\D/g, "")
  if (digits.length < 6 || digits.length > 15) {
    return { ok: false as const, error: `${label} should be 6 to 15 digits.` }
  }
  return { ok: true as const, value: digits }
}

export function parseProfile(formData: FormData) {
  const schema = z.object({
    name: z.string().trim().min(2, "Add the salon name.").max(80, "That name is too long."),
    citySlug: z.string().trim().min(1, "Choose a city."),
    areaSlug: z.string().trim().min(1, "Choose a locality."),
    address: z.string().trim().min(8, "Add a street address.").max(200),
    description: z.string().trim().max(800, "Keep the description under 800 characters."),
    gender: z.enum(GENDERS, { error: "Choose who the salon is for." }),
    phone: z.string(),
    whatsapp: z.string(),
  })
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    citySlug: String(formData.get("citySlug") ?? ""),
    areaSlug: String(formData.get("areaSlug") ?? ""),
    address: String(formData.get("address") ?? ""),
    description: String(formData.get("description") ?? ""),
    gender: String(formData.get("gender") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
  })
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) }
  return { ok: true as const, data: parsed.data }
}

export function parseService(formData: FormData) {
  const schema = z.object({
    name: z.string().trim().min(2, "Add the service name.").max(80),
    category: z.enum(SERVICE_CATEGORIES, { error: "Choose a category." }),
    priceInr: z.coerce
      .number({ error: "Enter a price in rupees." })
      .int("Use a whole rupee amount.")
      .min(1, "Price should be at least ₹1.")
      .max(500000, "That price looks too high."),
    durationMin: z.coerce
      .number({ error: "Enter a duration in minutes." })
      .int("Use whole minutes.")
      .min(5, "Duration should be at least 5 minutes.")
      .max(600, "Duration should be 10 hours or less."),
  })
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    priceInr: formData.get("priceInr"),
    durationMin: formData.get("durationMin"),
  })
  if (!parsed.success) return { ok: false as const, error: firstIssue(parsed.error) }
  return { ok: true as const, data: parsed.data }
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

export function parseHours(formData: FormData) {
  const rows: { dayOfWeek: number; closed: boolean; openTime: string; closeTime: string }[] = []
  for (let day = 0; day < 7; day += 1) {
    const closed = formData.get(`closed-${day}`) === "on"
    const openTime = String(formData.get(`open-${day}`) ?? "10:00")
    const closeTime = String(formData.get(`close-${day}`) ?? "20:00")
    if (!timePattern.test(openTime) || !timePattern.test(closeTime)) {
      return { ok: false as const, error: "Use opening and closing times like 10:00." }
    }
    if (!closed && closeTime <= openTime) {
      return { ok: false as const, error: "Closing time should be after opening time." }
    }
    rows.push({ dayOfWeek: day, closed, openTime, closeTime })
  }
  return { ok: true as const, rows }
}

export function parsePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "")
  if (password.length < 8) return { ok: false as const, error: "Use at least 8 characters." }
  if (password.length > 72) return { ok: false as const, error: "Use 72 characters or fewer." }
  return { ok: true as const, password }
}
