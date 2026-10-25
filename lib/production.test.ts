import assert from "node:assert/strict"
import test from "node:test"
import { assertProductionRuntime } from "./production"

const ready: Record<string, string | undefined> = {
  NODE_ENV: "production",
  NEXT_PHASE: undefined,
  AUTH_SECRET: "production-secret-value-0123456789abcd",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/salon",
  NEXT_PUBLIC_APP_URL: "https://notsooboring.com",
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD: "unique-admin-password",
  IMAGE_DRIVER: "gcs",
  GCS_BUCKET: "salon-photos",
}

async function withEnv(patch: Record<string, string | undefined>, run: () => Promise<void> | void) {
  const previous = new Map<string, string | undefined>()
  const keys = new Set([...Object.keys(ready), ...Object.keys(patch)])
  for (const key of keys) {
    previous.set(key, process.env[key])
  }
  for (const [key, value] of Object.entries({ ...ready, ...patch })) {
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

test("production accepts gcs when GCS_BUCKET is set", async () => {
  await withEnv({ IMAGE_DRIVER: "gcs", GCS_BUCKET: "  salon-photos  " }, () => {
    assert.doesNotThrow(() => assertProductionRuntime())
  })
})

test("production accepts s3 without GCS_BUCKET", async () => {
  await withEnv({ IMAGE_DRIVER: "s3", GCS_BUCKET: undefined }, () => {
    assert.doesNotThrow(() => assertProductionRuntime())
  })
})

test("production rejects local and an unset image driver", async () => {
  await withEnv({ IMAGE_DRIVER: "local" }, () => {
    assert.throws(() => assertProductionRuntime(), /IMAGE_DRIVER=s3 or IMAGE_DRIVER=gcs/)
  })
  await withEnv({ IMAGE_DRIVER: undefined }, () => {
    assert.throws(() => assertProductionRuntime(), /IMAGE_DRIVER=s3 or IMAGE_DRIVER=gcs/)
  })
})

test("production rejects gcs without a bucket", async () => {
  await withEnv({ IMAGE_DRIVER: "gcs", GCS_BUCKET: undefined }, () => {
    assert.throws(() => assertProductionRuntime(), /GCS_BUCKET/)
  })
  await withEnv({ IMAGE_DRIVER: "gcs", GCS_BUCKET: "   " }, () => {
    assert.throws(() => assertProductionRuntime(), /GCS_BUCKET/)
  })
})

test("image storage is not validated outside production or during next build", async () => {
  await withEnv({ NODE_ENV: "development", IMAGE_DRIVER: "local", GCS_BUCKET: undefined }, () => {
    assert.doesNotThrow(() => assertProductionRuntime())
  })
  await withEnv(
    { NEXT_PHASE: "phase-production-build", IMAGE_DRIVER: "local", GCS_BUCKET: undefined },
    () => {
      assert.doesNotThrow(() => assertProductionRuntime())
    },
  )
})
