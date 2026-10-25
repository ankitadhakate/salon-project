import type { Metadata } from "next"

/** Public search engines are off until this is the string "true". */
export function allowIndexing() {
  return process.env.ALLOW_INDEXING === "true"
}

/** Approved, non-sample salons required before a directory page can be indexed. */
export function indexMinSalons() {
  const parsed = Number.parseInt(process.env.INDEX_MIN_SALONS ?? "8", 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 8
  return parsed
}

export function hasTeamIntro(intro: string | null | undefined) {
  return Boolean(intro && intro.trim().length > 0)
}

/** City, locality, and service pages. Samples never count toward the threshold. */
export function directoryEligible(intro: string | null | undefined, realSalonCount: number) {
  return hasTeamIntro(intro) && realSalonCount >= indexMinSalons()
}

export function robotsFor(eligible: boolean): NonNullable<Metadata["robots"]> {
  if (!allowIndexing() || !eligible) return { index: false, follow: false }
  return { index: true, follow: true }
}

/** Filtered or sorted URLs stay out of the index and point at the clean page. */
export function robotsForListing(eligible: boolean, filtered: boolean): NonNullable<Metadata["robots"]> {
  if (!allowIndexing()) return { index: false, follow: false }
  if (filtered || !eligible) return { index: false, follow: true }
  return robotsFor(eligible)
}
