import assert from "node:assert/strict"
import test from "node:test"
import sharp from "sharp"
import { ImageStorageError, prepareImage } from "./storage"

test("re-encodes to webp, rotates, resizes, and strips metadata", async () => {
  const raw = await sharp({
    create: { width: 2000, height: 16, channels: 3, background: { r: 180, g: 30, b: 30 } },
  })
    .jpeg()
    .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: "secret-location" } } })
    .toBuffer()
  const file = new File([new Uint8Array(raw)], "chair.jpg", { type: "image/jpeg" })
  const out = await prepareImage(file)
  const meta = await sharp(out).metadata()
  assert.equal(meta.format, "webp")
  assert.equal(meta.exif, undefined)
  assert.equal(meta.width, 16)
  assert.equal(meta.height, 2000)

  const wide = await sharp({
    create: { width: 2400, height: 800, channels: 3, background: { r: 20, g: 40, b: 180 } },
  })
    .png()
    .toBuffer()
  const wideOut = await prepareImage(new File([new Uint8Array(wide)], "wide.png", { type: "image/png" }))
  const wideMeta = await sharp(wideOut).metadata()
  assert.equal(wideMeta.format, "webp")
  assert.equal(wideMeta.width, 1600)
  assert.equal(wideMeta.exif, undefined)
})

test("rejects a file that is not a jpeg, png, or webp", async () => {
  const file = new File([new TextEncoder().encode("not a photo")], "notes.jpg", { type: "image/jpeg" })
  await assert.rejects(() => prepareImage(file), ImageStorageError)
})
