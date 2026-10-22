import { createHash, randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import {
  readSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
  signSession,
} from "@/lib/session-token"

export type SessionUser = {
  id: string
  email: string
  name: string
  role: string
  hasPassword: boolean
  referralCode: string | null
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}

export async function createSession(userId: string, role: string) {
  const token = await signSession(userId, role)
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, sessionCookieOptions())
}

export async function clearSession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const session = await readSessionToken(token)
    if (!session) return null
    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasPassword: Boolean(user.passwordHash),
      referralCode: user.referralCode,
    }
  } catch {
    return null
  }
}

export function hashMagicToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export function newMagicToken() {
  return randomBytes(32).toString("hex")
}

export async function consumeMagicLink(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null
  const tokenHash = hashMagicToken(token)
  const updated = await prisma.magicLink.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  })
  if (updated.count !== 1) return null
  const link = await prisma.magicLink.findUnique({
    where: { tokenHash },
    include: { user: true },
  })
  if (!link?.user) return null
  return link.user
}
