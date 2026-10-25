import assert from "node:assert/strict"
import test from "node:test"
import sharp from "sharp"
import { IMMUTABLE_CACHE } from "./cache-control"
import {
  createKeylessGcsClient,
  gcsObjectUrl,
  getImageStorage,
  ImageStorageError,
  type GcsClient,
} from "./storage"

async function withEnv(patch: Record<string, string | undefined>, run: () => Promise<void>) {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(patch)) {
    previous.set(key, process.env[key])
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    await run()
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

async function tinyJpeg() {
  const raw = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .jpeg()
    .toBuffer()
  return new File([new Uint8Array(raw)], "chair.jpg", { type: "image/jpeg" })
}

type SavedOptions = {
  resumable?: boolean
  contentType?: string
  metadata?: { contentType?: string; cacheControl?: string }
  public?: boolean
  predefinedAcl?: string
  private?: boolean
}

function recordingClient() {
  const saves: Array<{ bucket: string; key: string; body: Buffer; options: SavedOptions }> = []
  const deletes: Array<{ bucket: string; key: string; options: unknown }> = []
  let created = 0
  const client: GcsClient = {
    bucket(bucket) {
      return {
        file(key) {
          return {
            async save(body, options) {
              saves.push({ bucket, key, body, options: options ?? {} })
            },
            async delete(options) {
              deletes.push({ bucket, key, options })
            },
          }
        },
      }
    },
  }
  return {
    saves,
    deletes,
    created: () => created,
    factory: async () => {
      created += 1
      return client
    },
  }
}

test("gcs object urls use GCS_PUBLIC_URL or the storage.googleapis.com default", async () => {
  await withEnv({ GCS_BUCKET: "salon-photos", GCS_PUBLIC_URL: undefined }, async () => {
    assert.equal(
      gcsObjectUrl("salon-photos", "salons/1-abcdef123456.webp"),
      "https://storage.googleapis.com/salon-photos/salons/1-abcdef123456.webp",
    )
  })
  await withEnv({ GCS_PUBLIC_URL: "https://images.example.com/photos/" }, async () => {
    assert.equal(
      gcsObjectUrl("salon-photos", "salons/1-abcdef123456.webp"),
      "https://images.example.com/photos/salons/1-abcdef123456.webp",
    )
  })
  await withEnv({ GCS_PUBLIC_URL: "   " }, async () => {
    assert.equal(
      gcsObjectUrl("other-bucket", "salons/1-abcdef123456.webp"),
      "https://storage.googleapis.com/other-bucket/salons/1-abcdef123456.webp",
    )
  })
})

test("gcs upload sets content type and immutable cache without an object ACL", async () => {
  const recorded = recordingClient()
  await withEnv(
    { IMAGE_DRIVER: "gcs", GCS_BUCKET: "  salon-photos  ", GCS_PUBLIC_URL: undefined },
    async () => {
      const stored = await getImageStorage(recorded.factory).save(await tinyJpeg())
      assert.equal(recorded.saves.length, 1)
      assert.equal(recorded.created(), 1)
      const save = recorded.saves[0]
      assert.ok(save)
      assert.equal(save.bucket, "salon-photos")
      assert.match(save.key, /^salons\/\d+-[0-9a-f]{12}\.webp$/)
      assert.equal(save.body.length > 0, true)
      assert.equal(save.options.resumable, false)
      assert.equal(save.options.contentType, "image/webp")
      assert.equal(save.options.metadata?.contentType, "image/webp")
      assert.equal(save.options.metadata?.cacheControl, IMMUTABLE_CACHE)
      assert.match(save.options.metadata?.cacheControl ?? "", /public, max-age=31536000/)
      assert.match(save.options.metadata?.cacheControl ?? "", /immutable/)
      assert.equal("public" in save.options, false)
      assert.equal("predefinedAcl" in save.options, false)
      assert.equal("private" in save.options, false)
      assert.equal("acl" in (save.options.metadata ?? {}), false)
      assert.equal(stored.key, save.key)
      assert.equal(stored.url, `https://storage.googleapis.com/salon-photos/${save.key}`)
    },
  )
})

test("gcs upload uses a custom public base without a trailing slash", async () => {
  const recorded = recordingClient()
  await withEnv(
    {
      IMAGE_DRIVER: "gcs",
      GCS_BUCKET: "salon-photos",
      GCS_PUBLIC_URL: "https://cdn.example.com/salon-photos/",
    },
    async () => {
      const stored = await getImageStorage(recorded.factory).save(await tinyJpeg())
      assert.equal(stored.url, `https://cdn.example.com/salon-photos/${stored.key}`)
    },
  )
})

test("gcs delete removes the object and skips unsafe keys", async () => {
  const recorded = recordingClient()
  await withEnv({ IMAGE_DRIVER: "gcs", GCS_BUCKET: "salon-photos" }, async () => {
    const storage = getImageStorage(recorded.factory)
    await storage.remove("salons/1-abcdef123456.webp")
    await storage.remove("demo/chair.webp")
    await storage.remove("../secret.webp")
    await storage.remove("")
    assert.deepEqual(recorded.deletes, [
      {
        bucket: "salon-photos",
        key: "salons/1-abcdef123456.webp",
        options: { ignoreNotFound: true },
      },
    ])
    assert.equal(recorded.created(), 1)
  })
})

test("gcs save and delete require GCS_BUCKET before opening a client", async () => {
  const recorded = recordingClient()
  await withEnv({ IMAGE_DRIVER: "gcs", GCS_BUCKET: "  ", GCS_PUBLIC_URL: undefined }, async () => {
    const storage = getImageStorage(recorded.factory)
    const file = await tinyJpeg()
    await assert.rejects(() => storage.save(file), ImageStorageError)
    await assert.rejects(() => storage.remove("salons/1-abcdef123456.webp"), /GCS_BUCKET/)
    assert.equal(recorded.created(), 0)
    assert.equal(recorded.saves.length, 0)
    assert.equal(recorded.deletes.length, 0)
  })
})

test("keyless gcs client is constructed with no key file and no credentials", async () => {
  let options: unknown = "not-constructed"
  await createKeylessGcsClient(async () => {
    return class {
      constructor(received?: { keyFilename?: string; credentials?: object }) {
        options = received
      }
      bucket(): ReturnType<GcsClient["bucket"]> {
        throw new Error("unused")
      }
    }
  })
  assert.equal(options, undefined)
})

test("local driver still stores a webp under public/uploads", async () => {
  await withEnv({ IMAGE_DRIVER: undefined }, async () => {
    const storage = getImageStorage()
    const stored = await storage.save(await tinyJpeg())
    try {
      assert.match(stored.url, /^\/uploads\/\d+-[0-9a-f]{12}\.webp$/)
      assert.equal(stored.key, stored.url.slice("/uploads/".length))
    } finally {
      await storage.remove(stored.key)
    }
  })
})
