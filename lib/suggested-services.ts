export type SuggestedService = {
  category: string
  name: string
  priceInr: number
  durationMin: number
}

/** Starting prices owners can tick, then change. Amounts are rupees. */
export const SUGGESTED_SERVICES: SuggestedService[] = [
  { category: "Hair", name: "Haircut", priceInr: 400, durationMin: 30 },
  { category: "Hair", name: "Haircut and blowdry", priceInr: 800, durationMin: 60 },
  { category: "Hair", name: "Hair colour", priceInr: 2500, durationMin: 120 },
  { category: "Grooming", name: "Beard trim", priceInr: 150, durationMin: 20 },
  { category: "Grooming", name: "Shave", priceInr: 200, durationMin: 20 },
  { category: "Skin", name: "Cleanup", priceInr: 600, durationMin: 30 },
  { category: "Skin", name: "Facial", priceInr: 1200, durationMin: 60 },
  { category: "Makeup", name: "Party makeup", priceInr: 3500, durationMin: 90 },
  { category: "Makeup", name: "Bridal makeup", priceInr: 15000, durationMin: 180 },
  { category: "Nails", name: "Manicure", priceInr: 500, durationMin: 40 },
  { category: "Nails", name: "Pedicure", priceInr: 700, durationMin: 45 },
  { category: "Waxing", name: "Full arms waxing", priceInr: 400, durationMin: 30 },
  { category: "Spa", name: "Head massage", priceInr: 400, durationMin: 20 },
]

export const SETUP_STEPS = [
  { id: "account", label: "Account" },
  { id: "salon", label: "Salon" },
  { id: "contact", label: "Contact" },
  { id: "services", label: "Services" },
  { id: "photos", label: "Photos" },
] as const

export type SetupStep = (typeof SETUP_STEPS)[number]["id"]

export function setupStep(value: string | undefined): SetupStep {
  const found = SETUP_STEPS.find((step) => step.id === value)
  return found?.id ?? "account"
}
