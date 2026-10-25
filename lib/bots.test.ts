import assert from "node:assert/strict"
import test from "node:test"
import { isBotUserAgent } from "./bots"

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"

test("rejects empty and known crawler user agents", () => {
  assert.equal(isBotUserAgent(null), true)
  assert.equal(isBotUserAgent(""), true)
  assert.equal(isBotUserAgent("curl/8.0"), true)
  assert.equal(
    isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"),
    true,
  )
  assert.equal(isBotUserAgent("WhatsApp/2.23.20.0"), true)
})

test("keeps a normal phone browser", () => {
  assert.equal(isBotUserAgent(IPHONE), false)
})
