import assert from "node:assert/strict"
import test from "node:test"
import { inr, isOpenNow, openStatusLabel } from "./format"
import { siteName } from "./site"
import { appointmentHref, appointmentMessage, slotsForDay } from "./appointments"

test("groups rupees with en-IN digits", () => {
  assert.equal(inr(500), "₹500")
  assert.equal(inr(1500), "₹1,500")
  assert.equal(inr(100000), "₹1,00,000")
})

test("treats an overnight close as still open after midnight", () => {
  const hours = [
    { dayOfWeek: 5, closed: false, openTime: "18:00", closeTime: "02:00" },
    { dayOfWeek: 6, closed: true, openTime: "10:00", closeTime: "20:00" },
  ]
  const stillOpen = new Date("2026-10-31T19:30:00.000Z")
  assert.equal(isOpenNow(hours, "Asia/Kolkata", stillOpen), true)
  assert.equal(openStatusLabel(hours, "Asia/Kolkata", stillOpen), "Open now · closes 2 am")
  const closedMorning = new Date("2026-11-01T04:30:00.000Z")
  assert.equal(isOpenNow(hours, "Asia/Kolkata", closedMorning), false)
})

test("names the next opening, including tomorrow", () => {
  const hours = [
    { dayOfWeek: 6, closed: true, openTime: "10:00", closeTime: "20:00" },
    { dayOfWeek: 0, closed: false, openTime: "10:00", closeTime: "20:00" },
  ]
  const sundayMorning = new Date("2026-11-01T04:30:00.000Z")
  assert.equal(openStatusLabel(hours, "Asia/Kolkata", sundayMorning), "Closed · opens 10 am tomorrow")
})

test("drops closed days and past slots", () => {
  assert.deepEqual(
    slotsForDay({ closed: true, openTime: "10:00", closeTime: "20:00" }, { isToday: false, nowMinutes: 0 }),
    [],
  )
  const later = slotsForDay(
    { closed: false, openTime: "10:00", closeTime: "12:00" },
    { isToday: true, nowMinutes: 10 * 60 + 31 },
  )
  assert.deepEqual(later.map((slot) => slot.value), ["11:00", "11:30"])
  const overnight = slotsForDay(
    { closed: false, openTime: "22:00", closeTime: "02:00" },
    { isToday: false, nowMinutes: 0 },
  )
  assert.deepEqual(overnight.map((slot) => slot.value), ["22:00", "22:30", "23:00", "23:30", "00:00", "00:30", "01:00", "01:30"])
})

test("encodes the appointment WhatsApp link with the city dial code", () => {
  const brand = siteName()
  const message = appointmentMessage({
    salonName: "Glow",
    brand,
    serviceName: "Haircut",
    priceInr: 500,
    dateLabel: "Sat, 1 Nov",
    timeLabel: "4:30 pm",
    name: "Ada",
  })
  assert.equal(
    message,
    `Hi Glow, I found you on ${brand}. I'd like to book Haircut (₹500) on Sat, 1 Nov at 4:30 pm. Name: Ada. Is this slot available?`,
  )
  const href = appointmentHref("9000000000", "971", message)
  assert.ok(href.startsWith("https://wa.me/9719000000000?text="))
  assert.equal(decodeURIComponent(href.slice(href.indexOf("text=") + 5)), message)
  const unnamed = appointmentMessage({
    salonName: "Glow",
    brand,
    serviceName: "Haircut",
    priceInr: 500,
    dateLabel: "Sat, 1 Nov",
    timeLabel: "4:30 pm",
    name: "  ",
  })
  assert.equal(unnamed.includes("Name:"), false)
})
