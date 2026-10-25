import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import { cacheControlFor, IMMUTABLE_CACHE, PRIVATE_NO_STORE, PUBLIC_PAGE_CACHE, PUBLIC_PAGE_VARY, varyForCache } from "./cache-control"

const anon = { method: "GET", hasSession: false, preview: false }

test("public pages get a shared cache with stale-while-revalidate", () => {
  for (const pathname of ["/", "/for-salons", "/example-city", "/example-city/central", "/example-city/central/atelier"]) {
    assert.equal(cacheControlFor({ ...anon, pathname }), PUBLIC_PAGE_CACHE)
  }
  assert.equal(PUBLIC_PAGE_CACHE, "public, s-maxage=300, stale-while-revalidate=600")
  assert.equal(varyForCache(PUBLIC_PAGE_CACHE), PUBLIC_PAGE_VARY)
  assert.equal(PUBLIC_PAGE_VARY, "Cookie")
})

test("owner, auth, and session responses are private", () => {
  for (const pathname of [
    "/admin",
    "/admin/anything",
    "/dashboard",
    "/dashboard/stats",
    "/partner",
    "/partner/login",
    "/partner/edit",
    "/partner/claim/token",
    "/partner/claim/verify",
    "/login",
    "/signup",
    "/auth/magic",
    "/auth/logout",
    "/api/geocode",
    "/api/salon-stats",
  ]) {
    assert.equal(cacheControlFor({ ...anon, pathname }), PRIVATE_NO_STORE)
  }
  assert.equal(cacheControlFor({ ...anon, pathname: "/", hasSession: true }), PRIVATE_NO_STORE)
  assert.equal(cacheControlFor({ ...anon, pathname: "/example-city/central/atelier", preview: true }), PRIVATE_NO_STORE)
  assert.equal(cacheControlFor({ ...anon, method: "POST", pathname: "/" }), PRIVATE_NO_STORE)
  assert.equal(varyForCache(PRIVATE_NO_STORE), null)
})

test("firebase hosting caches hashed assets and uploaded photos as immutable", () => {
  const firebase = readFileSync(path.join(process.cwd(), "firebase.json"), "utf8")
  const config = JSON.parse(firebase) as {
    hosting: { rewrites: { run: { serviceId: string; region: string } }[]; headers: { source: string; headers: { value: string }[] }[] }
  }
  assert.equal(config.hosting.rewrites[0]?.run.serviceId, "saj-web")
  assert.equal(config.hosting.rewrites[0]?.run.region, "asia-south1")
  const sources = config.hosting.headers.map((entry) => entry.source)
  assert.deepEqual(sources, ["/_next/static/**", "/uploads/**", "/demo/**"])
  for (const entry of config.hosting.headers) {
    assert.equal(entry.headers[0]?.value, IMMUTABLE_CACHE)
  }
})
