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

test("reads the first forwarded address and a named cookie", () => {
  assert.equal(
    clientIpFromRequest(call({ "x-forwarded-for": "203.0.113.8, 10.0.0.1" })),
    "203.0.113.8",
  )
  assert.equal(readCookie(call({ cookie: "a=1; vid=abc%2F; b=2" }), "vid"), "abc/")
})
