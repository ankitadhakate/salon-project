import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { headerSessionLinks } from "./header-auth"

test("cached public header starts signed out and never includes Log out", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8")
  const header = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8")
  assert.equal(layout.includes("getSessionUser"), false)
  assert.equal(layout.includes("Log out"), false)
  assert.equal(header.includes("Log out"), false)
  assert.equal(header.includes("getSessionUser"), false)
  assert.match(header, /grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/)
  assert.equal(header.includes("List your salon free"), false)
  const pill = readFileSync(new URL("../components/area-pill.tsx", import.meta.url), "utf8")
  assert.match(pill, /Set location/)
  assert.match(pill, /truncate/)

  const signedOut = headerSessionLinks(null)
  assert.deepEqual(
    signedOut.map((link) => link.label),
    ["Login"],
  )
  assert.equal(signedOut.some((link) => link.label === "Log out"), false)

  const owner = headerSessionLinks({ role: "OWNER" })
  assert.deepEqual(
    owner.map((link) => link.label),
    ["Dashboard", "Log out"],
  )
  assert.equal(owner[0]?.kind === "link" && owner[0].href, "/dashboard")
  const admin = headerSessionLinks({ role: "ADMIN" })
  assert.equal(admin[0]?.kind === "link" && admin[0].href, "/admin")
  assert.equal(admin.some((link) => link.label === "Login"), false)
})
