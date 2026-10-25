"use server"

import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import {
  consumeMagicLink,
  createSession,
  getSessionUser,
  hashMagicToken,
  hashPassword,
  newMagicToken,
  verifyPassword,
} from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendSignInMail, smtpConfigured } from "@/lib/mail"
import { actionClientIp, limitLogin, limitMagicLink, limitSignup } from "@/lib/rate-limit"
import { appUrl, safeNextPath } from "@/lib/urls"
import { parseEmail, parseLogin, parseMagicSignup, parseSignup } from "@/lib/validators"

export type MagicState = {
  message?: string
  error?: string
  devLink?: string
} | null

function devMagic() {
  return process.env.NODE_ENV !== "production"
}

async function issueLink(userId: string, email: string) {
  const token = newMagicToken()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  await prisma.magicLink.deleteMany({
    where: { email, expiresAt: { lt: new Date() } },
  })
  await prisma.magicLink.create({
    data: {
      email,
      userId,
      tokenHash: hashMagicToken(token),
      expiresAt,
    },
  })
  const url = appUrl(`/auth/magic?token=${token}`)
  if (devMagic()) console.info(`Magic sign-in link for ${email}: ${url}`)
  if (smtpConfigured()) {
    try {
      await sendSignInMail(email, url)
    } catch (error) {
      console.error(error)
      return {
        error: "We couldn't send the email. Try again, or use your password.",
      } satisfies MagicState
    }
    return {
      message: "Check your inbox for a sign-in link. It expires in 30 minutes.",
    } satisfies MagicState
  }
  if (devMagic()) {
    return {
      message:
        "Email isn't configured on this machine, so your sign-in link is below. It expires in 30 minutes.",
      devLink: url,
    } satisfies MagicState
  }
  return {
    error: "Email sign-in needs SMTP. Use your password, or set SMTP on the server.",
  } satisfies MagicState
}

function accountError(formData: FormData, error: string): never {
  const ref = String(formData.get("referralCode") ?? "").trim()
  const params = new URLSearchParams()
  params.set("step", "account")
  params.set("error", error)
  if (/^[A-Za-z0-9-]{1,32}$/.test(ref)) params.set("ref", ref)
  redirect(`/partner/setup?${params.toString()}`)
}

function loginBack(next: string, error?: string) {
  const params = new URLSearchParams()
  if (next) params.set("next", next)
  if (error) params.set("error", error)
  const query = params.toString()
  return query ? `/partner/login?${query}` : "/partner/login"
}

export async function signup(formData: FormData) {
  const existing = await getSessionUser()
  if (existing) redirect(existing.role === "ADMIN" ? "/admin" : "/partner")

  const parsed = parseSignup(formData)
  const allowed = await limitSignup(await actionClientIp(), parsed.ok ? parsed.data.email : "")
  if (!allowed) accountError(formData, "Too many attempts. Wait an hour and try again.")
  if (!parsed.ok) accountError(formData, parsed.error)

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        role: "OWNER",
        referralCode: parsed.data.referralCode,
      },
    })
    await createSession(user.id, user.role)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      accountError(formData, "That email is already registered. Log in instead.")
    }
    throw error
  }
  redirect("/partner/setup?step=salon")
}

export async function login(formData: FormData) {
  const parsed = parseLogin(formData)
  const next = safeNextPath(String(formData.get("next") ?? ""))
  const allowed = await limitLogin(await actionClientIp(), parsed.ok ? parsed.data.email : "")
  if (!allowed) redirect(loginBack(next, "Too many attempts. Wait a few minutes and try again."))
  if (!parsed.ok) redirect(loginBack(next, parsed.error))

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  const matches =
    user?.passwordHash && (await verifyPassword(parsed.data.password, user.passwordHash))
  if (!user || !matches) {
    redirect(loginBack(next, "That email and password don't match."))
  }
  await createSession(user.id, user.role)
  if (next) redirect(next)
  redirect(user.role === "ADMIN" ? "/admin" : "/partner")
}

export async function requestLoginLink(_prev: MagicState, formData: FormData): Promise<MagicState> {
  const parsed = parseEmail(formData)
  const allowed = await limitMagicLink(await actionClientIp(), parsed.ok ? parsed.email : "")
  if (!allowed) return { error: "Too many attempts. Wait an hour and try again." }
  if (!parsed.ok) return { error: parsed.error }
  if (!smtpConfigured() && !devMagic()) {
    return { error: "Email sign-in needs SMTP. Use your password for now." }
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.email } })
  if (!user) {
    if (devMagic()) {
      return { error: "No account for that email yet. Sign up first." }
    }
    return { message: "If that email has an account, a sign-in link is on its way." }
  }
  return issueLink(user.id, user.email)
}

export async function requestSignupLink(_prev: MagicState, formData: FormData): Promise<MagicState> {
  const parsed = parseMagicSignup(formData)
  const allowed = await limitMagicLink(await actionClientIp(), parsed.ok ? parsed.data.email : "")
  if (!allowed) return { error: "Too many attempts. Wait an hour and try again." }
  if (!parsed.ok) return { error: parsed.error }
  if (!smtpConfigured() && !devMagic()) {
    return { error: "Email sign-up needs SMTP. Create a password instead." }
  }
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return { error: "That email is already registered. Use the login page for a sign-in link." }
  }
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: "OWNER",
      referralCode: parsed.data.referralCode,
    },
  })
  return issueLink(user.id, user.email)
}

export async function signInFromMagicToken(token: string) {
  const user = await consumeMagicLink(token)
  if (!user) return null
  await createSession(user.id, user.role)
  return user
}
