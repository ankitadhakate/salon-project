import { createHash, randomBytes } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { isBotUserAgent } from "@/lib/bots"
import { isProduction } from "@/lib/production"
import { clientIpFromRequest, originAllowed, readCookie } from "@/lib/request-guards"
import { limitStats } from "@/lib/rate-limit"

export type StatKind = "views" | "calls" | "whatsapps" | "directions"

const KINDS: StatKind[] = ["views", "calls", "whatsapps", "directions"]

export const VISITOR_COOKIE = "saj_vid"

export function isStatKind(value: string): value is StatKind {
  return KINDS.includes(value as StatKind)
}

/** Calendar day in the salon's timezone, stored as a date (no clock time). */
export function localDay(timeZone: string, now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  return new Date(`${day}T00:00:00.000Z`)
}

function visitorHash(id: string) {
  const salt = process.env.AUTH_SECRET || "saj-dev-rate-limit"
  return createHash("sha256").update(`${salt}\0visitor\0${id}`).digest("hex")
}

function visitorFromRequest(request: Request) {
  const existing = readCookie(request, VISITOR_COOKIE)
  if (/^[a-f0-9]{32}$/.test(existing)) return { id: existing, fresh: false }
  return { id: randomBytes(16).toString("hex"), fresh: true }
}

async function pruneStatEvents() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  await prisma.statDedup.deleteMany({ where: { createdAt: { lt: cutoff } } })
}

export type StatRecord =
  | { status: 204; cookie?: string }
  | { status: 400 | 403 | 429 }

/** Counts one event for a live, non-sample salon. Repeats from the same visitor on the same local day do not increment. */
export async function recordPublicStat(
  request: Request,
  salonId: string,
  kind: StatKind,
): Promise<StatRecord> {
  if (!originAllowed(request)) return { status: 403 }
  if (isBotUserAgent(request.headers.get("user-agent"))) return { status: 204 }
  const allowed = await limitStats(clientIpFromRequest(request))
  if (!allowed) return { status: 429 }
  if (!/^[a-z0-9]{8,40}$/i.test(salonId)) return { status: 400 }

  const visitor = visitorFromRequest(request)
  const cookie = visitor.fresh ? visitor.id : undefined

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      id: true,
      status: true,
      isDemo: true,
      city: { select: { timezone: true } },
    },
  })
  if (!salon || salon.status !== "LIVE" || salon.isDemo) return { status: 204, cookie }

  const day = localDay(salon.city.timezone)
  try {
    await prisma.statDedup.create({
      data: { salonId, day, kind, visitorHash: visitorHash(visitor.id) },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: 204, cookie }
    }
    throw error
  }

  await prisma.salonStat.upsert({
    where: { salonId_day: { salonId, day } },
    create: { salonId, day, [kind]: 1 },
    update: { [kind]: { increment: 1 } },
  })

  if (Math.random() < 0.05) {
    void pruneStatEvents().catch(() => undefined)
  }
  return { status: 204, cookie }
}

export type StatBucket = Record<StatKind, number>

export type StatTotals = {
  today: StatBucket
  week: StatBucket
  month: StatBucket
  total: StatBucket
}

function emptyBucket(): StatBucket {
  return { views: 0, calls: 0, whatsapps: 0, directions: 0 }
}

function shiftDay(day: Date, days: number) {
  const next = new Date(day)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

async function sumStats(salonId: string, since: Date | null, until: Date | null = null) {
  const day =
    since || until
      ? { ...(since ? { gte: since } : {}), ...(until ? { lte: until } : {}) }
      : undefined
  const row = await prisma.salonStat.aggregate({
    where: { salonId, ...(day ? { day } : {}) },
    _sum: { views: true, calls: true, whatsapps: true, directions: true },
  })
  const bucket = emptyBucket()
  for (const kind of KINDS) bucket[kind] = row._sum[kind] ?? 0
  return bucket
}

export async function salonStatTotals(salonId: string, timeZone: string): Promise<StatTotals> {
  const today = localDay(timeZone)
  const [todayStats, week, month, total] = await Promise.all([
    sumStats(salonId, today, today),
    sumStats(salonId, shiftDay(today, -6), today),
    sumStats(salonId, shiftDay(today, -29), today),
    sumStats(salonId, null),
  ])
  return { today: todayStats, week, month, total }
}

export function visitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction() || (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  }
}
