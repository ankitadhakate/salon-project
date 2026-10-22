import { SignJWT, jwtVerify } from "jose"

export const SESSION_COOKIE = "saj_session"

function key() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error("Set AUTH_SECRET to a random string of at least 16 characters.")
  }
  return new TextEncoder().encode(secret)
}

export async function signSession(userId: string, role: string) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(key())
}

export async function readSessionToken(token: string) {
  const { payload } = await jwtVerify(token, key())
  const role = payload.role
  if (!payload.sub || (role !== "OWNER" && role !== "ADMIN")) return null
  return { userId: payload.sub, role }
}

export function sessionCookieOptions() {
  const secure = (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://")
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  }
}
