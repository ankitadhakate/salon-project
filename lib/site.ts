export function siteName() {
  const value = (process.env.SITE_NAME || process.env.NEXT_PUBLIC_SITE_NAME || "Saj").trim()
  return value.slice(0, 40) || "Saj"
}
