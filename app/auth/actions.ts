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

export async function signup(formData: FormData) {
  const existing = await getSessionUser()
  if (existing) redirect(existing.role === "ADMIN" ? "/admin" : "/dashboard")

  const parsed = parseSignup(formData)
  if (!parsed.ok) {
    redirect(`/signup?error=${encodeURIComponent(parsed.error)}`)
  }

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
      redirect(
        `/signup?error=${encodeURIComponent("That email is already registered. Log in instead.")}`,
      )
    }
    throw error
  }
  redirect("/dashboard")
}

export async function login(formData: FormData) {
  const parsed = parseLogin(formData)
  const next = safeNextPath(String(formData.get("next") ?? ""))
  const back = next ? `/login?next=${encodeURIComponent(next)}` : "/login"
  if (!parsed.ok) redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(parsed.error)}`)

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  const matches =
    user?.passwordHash && (await verifyPassword(parsed.data.password, user.passwordHash))
  if (!user || !matches) {
    redirect(
      `${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent("That email and password don't match.")}`,
    )
  }
  await createSession(user.id, user.role)
  if (next) redirect(next)
  redirect(user.role === "ADMIN" ? "/admin" : "/dashboard")
}

export async function requestLoginLink(_prev: MagicState, formData: FormData): Promise<MagicState> {
  const parsed = parseEmail(formData)
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
