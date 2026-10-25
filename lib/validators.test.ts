import assert from "node:assert/strict"
import test from "node:test"
import { parseCustomServices, parseService } from "./validators"

function data(fields: Record<string, string>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.set(key, value)
  return form
}

test("a service can omit duration and mark the price as from", () => {
  const parsed = parseService(
    data({ name: "Keratin treatment", category: "Hair", priceInr: "4500", durationMin: "", priceFrom: "on" }),
  )
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.data.durationMin, null)
  assert.equal(parsed.data.priceFrom, true)
  assert.equal(parsed.data.name, "Keratin treatment")
})

test("service names and prices are limited", () => {
  const long = parseService(data({ name: "a".repeat(81), category: "Other", priceInr: "100", durationMin: "20" }))
  assert.equal(long.ok, false)
  const high = parseService(data({ name: "Colour", category: "Hair", priceInr: "900000", durationMin: "" }))
  assert.equal(high.ok, false)
})

test("custom rows keep name, category, price, from, and duration", () => {
  const form = new FormData()
  form.append("customName", "Nail art")
  form.append("customCategory", "Nails")
  form.append("customPrice", "900")
  form.append("customDuration", "")
  form.append("customFrom", "1")
  form.append("customName", "")
  form.append("customCategory", "Other")
  form.append("customPrice", "")
  form.append("customDuration", "")
  form.append("customFrom", "0")
  const parsed = parseCustomServices(form)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.rows.length, 1)
  assert.equal(parsed.rows[0]?.name, "Nail art")
  assert.equal(parsed.rows[0]?.priceFrom, true)
  assert.equal(parsed.rows[0]?.durationMin, null)
})
