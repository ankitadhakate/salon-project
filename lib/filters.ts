export const PRICE_BANDS = [
  { value: "ANY", label: "Any price" },
  { value: "under-500", label: "Under ₹500" },
  { value: "500-1500", label: "₹500–1,500" },
  { value: "1500-5000", label: "₹1,500–5,000" },
  { value: "5000-plus", label: "₹5,000+" },
] as const

const BAND_RANGE: Record<string, { min?: number; max?: number }> = {
  "under-500": { max: 500 },
  "500-1500": { min: 500, max: 1500 },
  "1500-5000": { min: 1500, max: 5000 },
  "5000-plus": { min: 5000 },
}

export type PublicFilters = {
  service: string
  gender: "" | "MEN" | "WOMEN" | "UNISEX"
  price: string
  minPrice?: number
  maxPrice?: number
}

type SearchParamValue = string | string[] | undefined
export type SearchParams = Record<string, SearchParamValue>

export function searchParam(sp: SearchParams, key: string) {
  const value = sp[key]
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ""
}

export function parseFilters(sp: SearchParams): PublicFilters {
  const service = searchParam(sp, "service").slice(0, 60)
  const genderRaw = searchParam(sp, "gender").toUpperCase()
  const gender =
    genderRaw === "MEN" || genderRaw === "WOMEN" || genderRaw === "UNISEX"
      ? genderRaw
      : ""
  const priceRaw = searchParam(sp, "price")
  const price = priceRaw in BAND_RANGE ? priceRaw : ""
  const range = BAND_RANGE[price] ?? {}
  return {
    service,
    gender,
    price,
    minPrice: range.min,
    maxPrice: range.max,
  }
}

export function filtersToQuery(filters: PublicFilters) {
  const params = new URLSearchParams()
  if (filters.service) params.set("service", filters.service)
  if (filters.gender) params.set("gender", filters.gender)
  if (filters.price) params.set("price", filters.price)
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function priceLabel(value: string) {
  return PRICE_BANDS.find((band) => band.value === value)?.label
}

export function describeFilters(filters: PublicFilters) {
  const parts: string[] = []
  if (filters.service) parts.push(filters.service)
  if (filters.gender === "MEN") parts.push("men")
  if (filters.gender === "WOMEN") parts.push("women")
  if (filters.gender === "UNISEX") parts.push("unisex only")
  const price = priceLabel(filters.price)
  if (price && filters.price) parts.push(price)
  return parts
}
