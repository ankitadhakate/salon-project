export type Area = {
  slug: string
  name: string
}

// Source of truth for launch localities. `prisma/seed.ts` copies this into
// the Locality table so the database matches the public URLs.
export const AREAS: Area[] = [
  { slug: "baner", name: "Baner" },
  { slug: "aundh", name: "Aundh" },
  { slug: "balewadi", name: "Balewadi" },
  { slug: "pashan", name: "Pashan" },
  { slug: "bavdhan", name: "Bavdhan" },
  { slug: "kothrud", name: "Kothrud" },
  { slug: "karve-nagar", name: "Karve Nagar" },
  { slug: "erandwane", name: "Erandwane" },
  { slug: "prabhat-road", name: "Prabhat Road" },
  { slug: "deccan", name: "Deccan" },
  { slug: "fc-road", name: "FC Road" },
  { slug: "shivajinagar", name: "Shivajinagar" },
  { slug: "model-colony", name: "Model Colony" },
  { slug: "camp", name: "Camp" },
  { slug: "swargate", name: "Swargate" },
  { slug: "koregaon-park", name: "Koregaon Park" },
  { slug: "kalyani-nagar", name: "Kalyani Nagar" },
  { slug: "viman-nagar", name: "Viman Nagar" },
  { slug: "kharadi", name: "Kharadi" },
  { slug: "hadapsar", name: "Hadapsar" },
  { slug: "magarpatta", name: "Magarpatta" },
  { slug: "wanowrie", name: "Wanowrie" },
  { slug: "nibm", name: "NIBM" },
  { slug: "kondhwa", name: "Kondhwa" },
  { slug: "sinhagad-road", name: "Sinhagad Road" },
  { slug: "wakad", name: "Wakad" },
  { slug: "hinjewadi", name: "Hinjewadi" },
  { slug: "pimple-saudagar", name: "Pimple Saudagar" },
  { slug: "pimpri", name: "Pimpri" },
  { slug: "chinchwad", name: "Chinchwad" },
]

const bySlug = new Map(AREAS.map((area) => [area.slug, area]))

export function getArea(slug: string): Area | undefined {
  return bySlug.get(slug)
}

export function areasAlphabetical(): Area[] {
  return [...AREAS].sort((a, b) => a.name.localeCompare(b.name, "en-IN"))
}
