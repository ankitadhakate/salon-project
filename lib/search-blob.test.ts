import assert from "node:assert/strict"
import test from "node:test"
import { buildSearchBlob } from "./search-blob"

test("custom service names are part of the public search text", () => {
  const blob = buildSearchBlob(["Saffron Atelier", "Baner", "Pune", "Keratin treatment", "Hair"])
  assert.match(blob, /keratin treatment/)
  assert.equal(blob, blob.toLowerCase())
})
