import { DAYS } from "@/lib/constants"

export function inr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function genderLabel(gender: string) {
  if (gender === "MEN") return "Men"
  if (gender === "WOMEN") return "Women"
  return "Unisex"
}

export function statusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Draft"
    case "PENDING":
      return "Pending review"
    case "LIVE":
      return "Live"
    case "HIDDEN":
      return "Hidden"
    default:
      return status
  }
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!rest) return hours === 1 ? "1 hr" : `${hours} hr`
  return `${hours} hr ${rest} min`
}

export function formatTime(value: string) {
  const [hourRaw, minuteRaw] = value.split(":")
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value
  const suffix = hour >= 12 ? "pm" : "am"
  const hour12 = hour % 12 || 12
  if (!minute) return `${hour12}${suffix}`
  return `${hour12}:${String(minute).padStart(2, "0")}${suffix}`
}

export function formatPhone(local: string, dialCode = "91") {
  if (dialCode === "91" && local.length === 10) {
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`
  }
  return `+${dialCode} ${local}`
}

export function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date)
}

type HourRow = {
  dayOfWeek: number
  closed: boolean
  openTime: string
  closeTime: string
}

export function weekdayIndex(timeZone = "Asia/Kolkata", now = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now)
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  }
  return map[weekday] ?? 0
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0
  return hour * 60 + minute
}

export function clockMinutes(timeZone = "Asia/Kolkata", now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  const hour = Number(parts.find((part) => part.type === "hour")?.value)
  const minute = Number(parts.find((part) => part.type === "minute")?.value)
  return hour * 60 + minute
}

export function isOpenNow(hours: HourRow[], timeZone = "Asia/Kolkata", now = new Date()) {
  const row = hours.find((hour) => hour.dayOfWeek === weekdayIndex(timeZone, now))
  if (!row || row.closed) return false
  const current = clockMinutes(timeZone, now)
  return current >= minutes(row.openTime) && current < minutes(row.closeTime)
}

export function todayHoursLabel(hours: HourRow[], timeZone = "Asia/Kolkata", now = new Date()) {
  const index = weekdayIndex(timeZone, now)
  const row = hours.find((hour) => hour.dayOfWeek === index)
  const day = DAYS[index] ?? "Today"
  if (!row || row.closed) return `${day}: closed`
  return `${day}: ${formatTime(row.openTime)} – ${formatTime(row.closeTime)}`
}

export function whatsAppHref(phone: string, salonName: string, brand: string, dialCode = "91") {
  const text = `Hi, I found ${salonName} on ${brand} and I'd like to ask about a booking.`
  return `https://wa.me/${dialCode}${phone}?text=${encodeURIComponent(text)}`
}

export function mapsHref(address: string, place = "") {
  const query = place ? `${address}, ${place}` : address
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
