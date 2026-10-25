import { createHash } from "node:crypto"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { clientIpFromHeaders } from "@/lib/request-guards"

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function subjectHash(subject: string) {
  const salt = process.env.AUTH_SECRET || "saj-dev-rate-limit"
  return createHash("sha256").update(`${salt}\0${subject}`).digest("hex")
}

export async function actionClientIp() {
  return clientIpFromHeaders(await headers())
}

/** Fixed window. The stored subject is a salted hash, never the raw IP or email. */
export async function consumeRateLimit(opts: {
  bucket: string
  subject: string
  limit: number
  windowMs: number
}) {
  const windowStart = new Date(Math.floor(Date.now() / opts.windowMs) * opts.windowMs)
  const row = await prisma.rateLimit.upsert({
    where: {
      bucket_subjectHash_windowStart: {
        bucket: opts.bucket,
        subjectHash: subjectHash(opts.subject),
        windowStart,
      },
    },
    create: {
      bucket: opts.bucket,
      subjectHash: subjectHash(opts.subject),
      windowStart,
      count: 1,
    },
    update: { count: { increment: 1 } },
  })
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - 2 * DAY)
    void prisma.rateLimit.deleteMany({ where: { windowStart: { lt: cutoff } } }).catch(() => undefined)
  }
  return row.count <= opts.limit
}

async function allowBoth(
  checks: Array<{ bucket: string; subject: string; limit: number; windowMs: number }>,
) {
  const results = await Promise.all(checks.map((check) => consumeRateLimit(check)))
  return results.every(Boolean)
}

export function limitLogin(ip: string, email: string) {
  return allowBoth([
    { bucket: "login-ip", subject: ip, limit: 10, windowMs: 15 * MINUTE },
    { bucket: "login-email", subject: email || "invalid", limit: 10, windowMs: 15 * MINUTE },
  ])
}

export function limitSignup(ip: string, email: string) {
  return allowBoth([
    { bucket: "signup-ip", subject: ip, limit: 5, windowMs: HOUR },
    { bucket: "signup-email", subject: email || "invalid", limit: 5, windowMs: HOUR },
  ])
}

export function limitMagicLink(ip: string, email: string) {
  return allowBoth([
    { bucket: "magic-ip", subject: ip, limit: 5, windowMs: HOUR },
    { bucket: "magic-email", subject: email || "invalid", limit: 3, windowMs: HOUR },
  ])
}

export function limitClaim(ip: string, inviteKey: string) {
  return allowBoth([
    { bucket: "claim-ip", subject: ip, limit: 8, windowMs: HOUR },
    { bucket: "claim-invite", subject: inviteKey || "invalid", limit: 5, windowMs: HOUR },
  ])
}

export function limitStats(ip: string) {
  return allowBoth([
    { bucket: "stats-ip-minute", subject: ip, limit: 30, windowMs: MINUTE },
    { bucket: "stats-ip-day", subject: ip, limit: 80, windowMs: DAY },
  ])
}
