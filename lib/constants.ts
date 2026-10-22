export const SERVICE_CATEGORIES = [
  "Hair",
  "Grooming",
  "Skin",
  "Makeup",
  "Nails",
  "Waxing",
  "Spa",
  "Other",
] as const

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

export const SALON_STATUSES = ["DRAFT", "PENDING", "LIVE", "HIDDEN"] as const
export const GENDERS = ["MEN", "WOMEN", "UNISEX"] as const

export const MAX_PHOTOS = 8
export const EARLY_PARTNER_PROGRAM = true
