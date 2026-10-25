import assert from "node:assert/strict"
import test from "node:test"
import { siteName } from "./site"

test("the built-in brand is LetsTrim unless SITE_NAME is set", () => {
  const previous = process.env.SITE_NAME
  const previousPublic = process.env.NEXT_PUBLIC_SITE_NAME
  delete process.env.SITE_NAME
  delete process.env.NEXT_PUBLIC_SITE_NAME
  try {
    assert.equal(siteName(), "LetsTrim")
    process.env.SITE_NAME = "  Other name  "
    assert.equal(siteName(), "Other name")
  } finally {
    if (previous === undefined) delete process.env.SITE_NAME
    else process.env.SITE_NAME = previous
    if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_SITE_NAME
    else process.env.NEXT_PUBLIC_SITE_NAME = previousPublic
  }
})
