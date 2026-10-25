const DEFAULT_SITE_NAME = "notsoboring"

export function siteName() {
  const value = (process.env.SITE_NAME || process.env.NEXT_PUBLIC_SITE_NAME || DEFAULT_SITE_NAME).trim()
  return value.slice(0, 40) || DEFAULT_SITE_NAME
}
