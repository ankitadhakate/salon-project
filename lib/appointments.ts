import { formatTime, inr, weekdayIndex, clockMinutes, type HourRow } from "@/lib/format"

export type AppointmentDay = {
  date: string
  dayOfWeek: number
  label: string
  shortLabel: string
  closed: boolean
  openTime: string
  closeTime: string
}

export type AppointmentSlot = { value: string; label: string }

function zonedDateKey(timeZone: string, now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

function shiftDateKey(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

function dateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date)
  const monthName = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date)
  return `${weekday}, ${day} ${monthName}`
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0
  return hour * 60 + minute
}

export function upcomingDays(timeZone: string, hours: HourRow[], count = 14, now = new Date()): AppointmentDay[] {
  const todayKey = zonedDateKey(timeZone, now)
  const todayIndex = weekdayIndex(timeZone, now)
  return Array.from({ length: count }, (_, offset) => {
    const dayOfWeek = (todayIndex + offset) % 7
    const row = hours.find((hour) => hour.dayOfWeek === dayOfWeek)
    const date = shiftDateKey(todayKey, offset)
    const shortLabel = dateLabel(date)
    return {
      date,
      dayOfWeek,
      label: offset === 0 ? `Today, ${shortLabel}` : offset === 1 ? `Tomorrow, ${shortLabel}` : shortLabel,
      shortLabel,
      closed: !row || row.closed,
      openTime: row?.openTime ?? "10:00",
      closeTime: row?.closeTime ?? "20:00",
    }
  })
}

/** 30-minute slots that finish by closing. Overnight close times continue past midnight. */
export function slotsForDay(
  row: Pick<HourRow, "closed" | "openTime" | "closeTime"> | undefined,
  options: { isToday: boolean; nowMinutes: number },
): AppointmentSlot[] {
  if (!row || row.closed) return []
  const open = toMinutes(row.openTime)
  let close = toMinutes(row.closeTime)
  if (close <= open) close += 24 * 60
  const slots: AppointmentSlot[] = []
  for (let start = open; start + 30 <= close; start += 30) {
    if (options.isToday && start < options.nowMinutes) continue
    const clock = start % (24 * 60)
    const value = `${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}`
    slots.push({ value, label: formatTime(value) })
  }
  return slots
}

export function nowMinutes(timeZone: string, now = new Date()) {
  return clockMinutes(timeZone, now)
}

export function appointmentMessage(input: {
  salonName: string
  brand: string
  serviceName: string
  priceInr: number
  dateLabel: string
  timeLabel: string
  name?: string
}) {
  const name = input.name?.trim()
  const who = name ? ` Name: ${name}.` : ""
  return `Hi ${input.salonName}, I found you on ${input.brand}. I'd like to book ${input.serviceName} (${inr(input.priceInr)}) on ${input.dateLabel} at ${input.timeLabel}.${who} Is this slot available?`
}

export function appointmentHref(phone: string, dialCode: string, message: string) {
  return `https://wa.me/${dialCode}${phone}?text=${encodeURIComponent(message)}`
}
