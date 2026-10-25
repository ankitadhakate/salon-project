import { randomBytes } from "node:crypto"
import { IMMUTABLE_CACHE } from "./cache-control"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const MAX_BYTES = 5 * 1024 * 1024
const MAX_WIDTH = 1600

export class ImageStorageError extends Error {}

export type StoredImage = { url: string; key: string }

export interface ImageStorage {
  save(file: File): Promise<StoredImage>
  remove(key: string): Promise<void>
}

function sniff(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg"
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png"
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp"
  }
  return null
}

/** Sniff, cap size, auto-rotate, strip metadata, and re-encode as WebP at most 1600px wide. */
export async function prepareImage(file: File) {
  if (!(file instanceof File) || file.size === 0) {
    throw new ImageStorageError("Choose a photo first.")
  }
  if (file.size > MAX_BYTES) {
    throw new ImageStorageError("Images must be under 5 MB.")
  }
  const original = Buffer.from(await file.arrayBuffer())
  if (original.length > MAX_BYTES) {
    throw new ImageStorageError("Images must be under 5 MB.")
  }
  if (!sniff(original)) {
    throw new ImageStorageError("Use a JPG, PNG, or WebP image.")
  }
  try {
    const buffer = await sharp(original, {
      failOn: "error",
      limitInputPixels: 24_000_000,
      sequentialRead: true,
      pages: 1,
    })
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    return buffer
  } catch (error) {
    if (error instanceof ImageStorageError) throw error
    throw new ImageStorageError("That file isn't a photo we can use.")
  }
}

function safeUploadName(key: string) {
  return !key.includes("..") && !key.includes("/") && !key.includes("\\") && key.length > 0
}

class LocalImageStorage implements ImageStorage {
  async save(file: File): Promise<StoredImage> {
    const buffer = await prepareImage(file)
    const key = `${Date.now()}-${randomBytes(6).toString("hex")}.webp`
    const dir = path.join(process.cwd(), "public", "uploads")
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, key), buffer)
    return { url: `/uploads/${key}`, key }
  }

  async remove(key: string) {
    if (!safeUploadName(key) || key.startsWith("demo")) return
    await unlink(path.join(process.cwd(), "public", "uploads", key)).catch(() => {})
  }
}

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new ImageStorageError(`Missing ${name} for image storage.`)
  return value
}

function objectKey() {
  return `salons/${Date.now()}-${randomBytes(6).toString("hex")}.webp`
}

function gcsBucket() {
  const value = process.env.GCS_BUCKET?.trim() ?? ""
  if (!value) throw new ImageStorageError("Missing GCS_BUCKET for image storage.")
  return value
}

/** Public object URL. `GCS_PUBLIC_URL` overrides the storage.googleapis.com default. */
export function gcsObjectUrl(bucket: string, key: string) {
  const configured = (process.env.GCS_PUBLIC_URL ?? "").trim().replace(/\/+$/, "")
  const base = configured || `https://storage.googleapis.com/${bucket}`
  return `${base}/${key}`
}

export type GcsClient = {
  bucket(name: string): {
    file(name: string): {
      save(
        data: Buffer,
        options?: {
          resumable?: boolean
          contentType?: string
          metadata?: { contentType?: string; cacheControl?: string }
          public?: boolean
          predefinedAcl?: string
          private?: boolean
        },
      ): Promise<void>
      delete(options?: { ignoreNotFound?: boolean }): Promise<unknown>
    }
  }
}

type StorageConstructor = new (options?: { keyFilename?: string; credentials?: object }) => GcsClient

async function loadStorageConstructor(): Promise<StorageConstructor> {
  const { Storage } = await import("@google-cloud/storage")
  return Storage as StorageConstructor
}

/**
 * Application Default Credentials only. Cloud Run supplies the attached service
 * account. This does not read a key file or pass client credentials.
 */
export async function createKeylessGcsClient(
  load: () => Promise<StorageConstructor> = loadStorageConstructor,
): Promise<GcsClient> {
  const Storage = await load()
  return new Storage()
}

// GCS XML API and R2 both reject the SDK default (WHEN_SUPPORTED) flexible checksums.
async function s3Client() {
  const { S3Client } = await import("@aws-sdk/client-s3")
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    },
  })
}

class S3ImageStorage implements ImageStorage {
  async save(file: File): Promise<StoredImage> {
    const buffer = await prepareImage(file)
    const key = objectKey()
    const bucket = requiredEnv("S3_BUCKET")
    const { PutObjectCommand } = await import("@aws-sdk/client-s3")
    const client = await s3Client()
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: "image/webp",
        CacheControl: IMMUTABLE_CACHE,
      }),
    )
    // S3_PUBLIC_URL is the public base, including the bucket for path-style hosts
    // such as https://storage.googleapis.com/<bucket>.
    const base = (process.env.S3_PUBLIC_URL || "").replace(/\/$/, "")
    const url = base
      ? `${base}/${key}`
      : `https://${bucket}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com/${key}`
    return { url, key }
  }

  async remove(key: string) {
    if (!key || key.startsWith("demo/") || key.includes("..")) return
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3")
    const client = await s3Client()
    await client.send(
      new DeleteObjectCommand({
        Bucket: requiredEnv("S3_BUCKET"),
        Key: key,
      }),
    )
  }
}

class GcsImageStorage implements ImageStorage {
  constructor(private readonly createClient: () => Promise<GcsClient> = createKeylessGcsClient) {}

  async save(file: File): Promise<StoredImage> {
    const buffer = await prepareImage(file)
    const key = objectKey()
    const bucket = gcsBucket()
    const client = await this.createClient()
    // Uniform bucket-level access rejects object ACLs. Do not set public or predefinedAcl.
    // Small photos use a simple upload. Resumable uploads are for larger objects.
    await client.bucket(bucket).file(key).save(buffer, {
      resumable: false,
      contentType: "image/webp",
      metadata: {
        contentType: "image/webp",
        cacheControl: IMMUTABLE_CACHE,
      },
    })
    return { url: gcsObjectUrl(bucket, key), key }
  }

  async remove(key: string) {
    if (!key || key.startsWith("demo/") || key.includes("..")) return
    const bucket = gcsBucket()
    const client = await this.createClient()
    await client.bucket(bucket).file(key).delete({ ignoreNotFound: true })
  }
}

export function getImageStorage(createGcs: () => Promise<GcsClient> = createKeylessGcsClient): ImageStorage {
  if (process.env.IMAGE_DRIVER === "gcs") return new GcsImageStorage(createGcs)
  if (process.env.IMAGE_DRIVER === "s3") return new S3ImageStorage()
  return new LocalImageStorage()
}
