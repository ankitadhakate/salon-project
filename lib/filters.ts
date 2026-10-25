import { inr } from "@/lib/format"

export const PRICE_BANDS = [
  { value: "ANY", label: "Any price" },
  { value: "under-500", label: `Under ${inr(500)}` },
  { value: "500-1500", label: `${inr(500)}–${inr(1500)}` },
  { value: "1500-5000", label: `${inr(1500)}–${inr(5000)}` },
  { value: "5000-plus", label: `${inr(5000)}+` },
] as const

const BAND_RANGE: Record<string, { min?: number; max?: number }> = {
  "under-500": { max: 500 },
  "500-1500": { min: 500, max: 1500 },
  "1500-5000": { min: 1500, max: 5000 },
  "5000-plus": { min: 5000 },
}

/** Directory load-more uses `take = page * pageSize`, so a huge page is a huge read. */
export const MAX_LIST_PAGE = 20

/** Above the published bands. Stops a crafted price from widening the comparison. */
export const MAX_PRICE_INR = 100_000

export function clampPage(page: number) {
  if (!Number.isFinite(page) || page < 1) return 1
  return Math.min(Math.floor(page), MAX_LIST_PAGE)
}

export function clampPriceInr(value: number | undefined) {
  if (value == null || !Number.isFinite(value)) return undefined
  return Math.min(MAX_PRICE_INR, Math.max(0, Math.round(value)))
}

export type SortKey = "" | "price-asc" | "price-desc" | "nearest" | "relevance"

export type PublicFilters = {
  service: string
  gender: "" | "MEN" | "WOMEN" | "UNISEX"
  price: string
  minPrice?: number
  maxPrice?: number
  open: boolean
  sort: SortKey
  page: number
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
  const minPrice = clampPriceInr(range.min)
  const maxPrice = clampPriceInr(range.max)
  const sortRaw = searchParam(sp, "sort")
  const sort: SortKey =
    sortRaw === "price-asc" || sortRaw === "price-desc" || sortRaw === "nearest" || sortRaw === "relevance"
      ? sortRaw
      : ""
  const page = clampPage(Number.parseInt(searchParam(sp, "page"), 10))
  return {
    service,
    gender,
    price,
    minPrice,
    maxPrice,
    open: searchParam(sp, "open") === "1",
    sort,
    page,
  }
}

export function hasActiveQuery(sp: SearchParams) {
  return Object.values(sp).some((value) => {
    const text = (Array.isArray(value) ? value[0] : value)?.trim() ?? ""
    return text.length > 0
  })
}

export function hasListingFilters(filters: PublicFilters) {
  return Boolean(filters.service || filters.gender || filters.price || filters.open)
}

export function filtersToQuery(filters: PublicFilters) {
  const params = new URLSearchParams()
  if (filters.service) params.set("service", filters.service)
  if (filters.gender) params.set("gender", filters.gender)
  if (filters.price) params.set("price", filters.price)
  if (filters.open) params.set("open", "1")
  if (filters.sort) params.set("sort", filters.sort)
  if (filters.page > 1) params.set("page", String(filters.page))
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
  if (filters.open) parts.push("Open now")
  return parts
}

export function resultSummary(count: number, parts: string[]) {
  const head = count === 1 ? "1 salon" : `${count} salons`
  return parts.length ? [head, ...parts].join(" · ") : head
}
