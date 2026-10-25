import assert from "node:assert/strict"
import test from "node:test"
import { statVisitorHash } from "./stats"

const day = new Date("2026-10-25T00:00:00.000Z")

test("dedupes a visitor from a salted hash of IP, user agent, and day", () => {
  const first = statVisitorHash("203.0.113.8", "Mozilla/5.0", day, "salt")
  assert.equal(statVisitorHash("203.0.113.8", "Mozilla/5.0", day, "salt"), first)
  assert.notEqual(statVisitorHash("203.0.113.9", "Mozilla/5.0", day, "salt"), first)
  assert.notEqual(statVisitorHash("203.0.113.8", "Other", day, "salt"), first)
  assert.notEqual(statVisitorHash("203.0.113.8", "Mozilla/5.0", new Date("2026-10-26T00:00:00.000Z"), "salt"), first)
  assert.notEqual(statVisitorHash("203.0.113.8", "Mozilla/5.0", day, "other-salt"), first)
  assert.equal(first.length, 64)
})
