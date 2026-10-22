import { prisma } from "@/lib/db"

export type StatKind = "views" | "calls" | "whatsapps" | "directions"

const KINDS: StatKind[] = ["views", "calls", "whatsapps", "directions"]

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

export async function recordStat(salonId: string, kind: StatKind) {
  if (!/^[a-z0-9]{8,40}$/i.test(salonId)) return
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { id: true, city: { select: { timezone: true } } },
  })
  if (!salon) return
  const day = localDay(salon.city.timezone)
  const bump = { [kind]: 1 }
  await prisma.salonStat.upsert({
    where: { salonId_day: { salonId, day } },
    create: { salonId, day, ...bump },
    update: { [kind]: { increment: 1 } },
  })
}

export type StatTotals = {
  today: { views: number; calls: number; whatsapps: number; directions: number }
  total: { views: number; calls: number; whatsapps: number; directions: number }
}

const empty = { views: 0, calls: 0, whatsapps: 0, directions: 0 }

export async function salonStatTotals(salonId: string, timeZone: string): Promise<StatTotals> {
  const rows = await prisma.salonStat.findMany({ where: { salonId } })
  const todayKey = localDay(timeZone).toISOString().slice(0, 10)
  const total = { ...empty }
  const today = { ...empty }
  for (const row of rows) {
    const key = row.day.toISOString().slice(0, 10)
    for (const kind of KINDS) {
      total[kind] += row[kind]
      if (key === todayKey) today[kind] += row[kind]
    }
  }
  return { today, total }
}
