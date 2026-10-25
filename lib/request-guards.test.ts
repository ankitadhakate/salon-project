import assert from "node:assert/strict"
import test from "node:test"
import { clientIpFromRequest, originAllowed, readCookie } from "./request-guards"

function call(headers: Record<string, string>) {
  return new Request("http://127.0.0.1:3847/api/salon-stats", { method: "POST", headers })
}

test("origin must match the public host or the request host", () => {
  const previous = process.env.NEXT_PUBLIC_APP_URL
  process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3847"
  try {
    assert.equal(originAllowed(call({ origin: "http://127.0.0.1:3847" })), true)
    assert.equal(originAllowed(call({ origin: "https://evil.example", host: "127.0.0.1:3847" })), false)
    assert.equal(originAllowed(call({ host: "127.0.0.1:3847" })), false)
    assert.equal(
      originAllowed(call({ origin: "http://localhost:3847", host: "localhost:3847" })),
      true,
    )
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = previous
  }
})

test("picks the client address to the left of the trusted proxy hops", () => {
  const previous = process.env.TRUST_PROXY_HOPS
  delete process.env.TRUST_PROXY_HOPS
  try {
    assert.equal(
      clientIpFromRequest(call({ "x-forwarded-for": "198.51.100.9, 203.0.113.8, 10.0.0.4, 35.191.0.1" })),
      "203.0.113.8",
    )
    assert.equal(
      clientIpFromRequest(call({ "x-forwarded-for": "203.0.113.8, 10.0.0.1" })),
      "203.0.113.8",
    )
    process.env.TRUST_PROXY_HOPS = "1"
    assert.equal(
      clientIpFromRequest(call({ "x-forwarded-for": "198.51.100.9, 203.0.113.8, 35.191.0.1" })),
      "203.0.113.8",
    )
    process.env.TRUST_PROXY_HOPS = "0"
    assert.equal(
      clientIpFromRequest(call({ "x-forwarded-for": "198.51.100.9", "x-real-ip": "203.0.113.4" })),
      "203.0.113.4",
    )
    assert.equal(clientIpFromRequest(call({})), "unknown")
  } finally {
    if (previous === undefined) delete process.env.TRUST_PROXY_HOPS
    else process.env.TRUST_PROXY_HOPS = previous
  }
  assert.equal(readCookie(call({ cookie: "a=1; vid=abc%2F; b=2" }), "vid"), "abc/")
})
