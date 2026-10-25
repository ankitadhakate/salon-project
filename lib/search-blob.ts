/** Lowercase text the public search matches. Service names belong here so custom services are findable. */
export function buildSearchBlob(parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .toLowerCase()
}
