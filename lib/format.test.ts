import assert from "node:assert/strict"
import test from "node:test"
import { inr } from "./format"

test("groups rupees with en-IN digits", () => {
  assert.equal(inr(500), "₹500")
  assert.equal(inr(1500), "₹1,500")
  assert.equal(inr(100000), "₹1,00,000")
})
