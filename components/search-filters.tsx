"use client"

import { useState } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { GENDERS, SERVICE_CATEGORIES } from "@/lib/constants"
import { PRICE_BANDS, priceLabel } from "@/lib/filters"
import {
  clearDiscoveryFilters,
  discoveryPath,
  type DiscoveryQuery,
} from "@/lib/discovery"

const RADII = [
  ["", "Any distance"],
  ["2", "2 km"],
  ["5", "5 km"],
  ["10", "10 km"],
  ["20", "20 km"],
] as const

function Fields({ query }: { query: DiscoveryQuery }) {
  return (
    <>
      {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
      {query.place ? <input type="hidden" name="place" value={query.place} /> : null}
      {query.near ? (
        <>
          <input type="hidden" name="lat" value={query.near.lat.toFixed(5)} />
          <input type="hidden" name="lng" value={query.near.lng.toFixed(5)} />
        </>
      ) : null}
      <fieldset>
        <legend className="text-sm font-medium">Distance</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {RADII.map(([value, label]) => (
            <label key={label} className="inline-flex h-10 cursor-pointer items-center rounded-full bg-blush-soft px-3 text-sm has-[:checked]:bg-sage has-[:checked]:text-foreground">
              <input type="radio" name="km" value={value} defaultChecked={(query.near?.km ? String(query.near.km) : "") === value} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block text-sm font-medium">
        Price
        <select name="price" defaultValue={query.price} className="mt-2 h-11 w-full rounded-xl bg-card px-3 ring-1 ring-border">
          {PRICE_BANDS.map((band) => (
            <option key={band.value} value={band.value === "ANY" ? "" : band.value}>
              {band.label}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 block text-sm font-medium">
        Service
        <select name="category" defaultValue={query.category} className="mt-2 h-11 w-full rounded-xl bg-card px-3 ring-1 ring-border">
          <option value="">Any service</option>
          {SERVICE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 block text-sm font-medium">
        Who it&apos;s for
        <select name="gender" defaultValue={query.gender} className="mt-2 h-11 w-full rounded-xl bg-card px-3 ring-1 ring-border">
          <option value="">Anyone</option>
          {GENDERS.map((gender) => (
            <option key={gender} value={gender}>
              {gender === "MEN" ? "Men" : gender === "WOMEN" ? "Women" : "Unisex"}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 flex min-h-11 items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="open" value="1" defaultChecked={query.open} className="size-4" />
        Open now
      </label>
      <label className="mt-4 block text-sm font-medium">
        Sort
        <select name="sort" defaultValue={query.sort} className="mt-2 h-11 w-full rounded-xl bg-card px-3 ring-1 ring-border">
          <option value="">Suggested</option>
          <option value="relevance">Relevance</option>
          <option value="nearest">Distance</option>
          <option value="price-asc">Price, low to high</option>
          <option value="price-desc">Price, high to low</option>
        </select>
      </label>
      <button type="submit" className="press mt-5 h-12 w-full rounded-2xl bg-primary font-semibold text-primary-foreground">
        Apply filters
      </button>
    </>
  )
}

export function SearchFilters({ query }: { query: DiscoveryQuery }) {
  const [open, setOpen] = useState(false)
  const cleared = discoveryPath(clearDiscoveryFilters(query))
  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="press inline-flex h-11 items-center rounded-full bg-sage px-4 text-sm font-semibold text-foreground">
          Filters
        </DialogTrigger>
        <DialogContent placement="panel" className="sheet-rise">
          <div className="flex items-center justify-between pr-12">
            <DialogTitle className="font-heading text-2xl">Filters</DialogTitle>
            <Link href={cleared} className="text-sm font-medium text-sage-ink" onClick={() => setOpen(false)}>
              Clear all
            </Link>
          </div>
          <form method="get" action="/search" className="mt-2">
            <Fields query={query} />
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function FilterChips({ query }: { query: DiscoveryQuery }) {
  const chips: { label: string; href: string }[] = []
  function without(patch: Partial<DiscoveryQuery>) {
    return discoveryPath({ ...query, ...patch, page: 1 })
  }
  if (query.near?.km) chips.push({ label: `${query.near.km} km`, href: without({ near: query.near ? { ...query.near, km: null } : null }) })
  if (query.price) chips.push({ label: priceLabel(query.price) ?? query.price, href: without({ price: "", minPrice: undefined, maxPrice: undefined }) })
  if (query.category) chips.push({ label: query.category, href: without({ category: "" }) })
  if (query.gender) chips.push({ label: query.gender === "MEN" ? "Men" : query.gender === "WOMEN" ? "Women" : "Unisex", href: without({ gender: "" }) })
  if (query.open) chips.push({ label: "Open now", href: without({ open: false }) })
  if (query.sort === "relevance") chips.push({ label: "Relevance", href: without({ sort: "" }) })
  if (query.sort === "nearest") chips.push({ label: "Distance", href: without({ sort: "" }) })
  if (query.sort === "price-asc") chips.push({ label: "Lowest price", href: without({ sort: "" }) })
  if (query.sort === "price-desc") chips.push({ label: "Highest price", href: without({ sort: "" }) })
  if (chips.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.label}>
          <Link href={chip.href} className="inline-flex h-9 items-center rounded-full bg-blush-soft px-3 text-sm">
            {chip.label} <span className="sr-only">Remove filter</span>
            <span aria-hidden className="ml-1">×</span>
          </Link>
        </li>
      ))}
      <li>
        <Link href={discoveryPath(clearDiscoveryFilters(query))} className="inline-flex h-9 items-center text-sm font-medium text-sage-ink">
          Clear all
        </Link>
      </li>
    </ul>
  )
}
