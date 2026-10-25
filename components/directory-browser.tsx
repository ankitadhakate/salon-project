"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SalonCard } from "@/components/salon-card"
import { SalonSkeletons } from "@/components/salon-skeletons"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { buttonVariants } from "@/components/ui/button"
import {
  PRICE_BANDS,
  describeFilters,
  filtersToQuery,
  hasListingFilters,
  priceLabel,
  resultSummary,
  type PublicFilters,
} from "@/lib/filters"
import type { NearQuery } from "@/lib/geo"
import type { ListedSalon } from "@/lib/salons"
import { cn } from "@/lib/utils"

const field =
  "h-12 w-full rounded-xl border border-input bg-card px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

function chipClass(on: boolean) {
  return cn(
    "inline-flex h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium",
    on ? "bg-sage text-foreground" : "bg-card text-foreground ring-1 ring-border hover:bg-blush",
  )
}

const genders = [
  { value: "", label: "Anyone" },
  { value: "WOMEN", label: "Women" },
  { value: "MEN", label: "Men" },
  { value: "UNISEX", label: "Unisex only" },
] as const

export function DirectoryBrowser({
  path,
  filters,
  near,
  services,
  salons,
  hasMore,
  total,
  summaryLead = [],
  showService = true,
  empty,
}: {
  path: string
  filters: PublicFilters
  near: NearQuery | null
  services: { value: string; label: string }[]
  salons: ListedSalon[]
  hasMore: boolean
  total: number
  summaryLead?: string[]
  showService?: boolean
  empty: {
    kind: "area" | "city" | "service" | "radius"
    areaName?: string
    cityName: string
    cityHref: string
    serviceName?: string
    nearby?: { href: string; name: string }[]
    widenHref?: string
    radiusKm?: number | null
  }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const count = [filters.service, filters.gender, filters.price, filters.open ? "1" : ""].filter(Boolean).length
  const parts = [...summaryLead, ...describeFilters(showService ? filters : { ...filters, service: "" })]
  const filtered = hasListingFilters(showService ? filters : { ...filters, service: "" })

  function hrefFor(next: PublicFilters, nextNear: NearQuery | null = near) {
    const params = new URLSearchParams(filtersToQuery(next).replace(/^\?/, ""))
    if (nextNear) {
      params.set("lat", nextNear.lat.toFixed(5))
      params.set("lng", nextNear.lng.toFixed(5))
      if (nextNear.km) params.set("km", String(nextNear.km))
    }
    const query = params.toString()
    return query ? `${path}${query.startsWith("?") ? query : `?${query}`}` : path
  }

  function apply(next: PublicFilters) {
    startTransition(() => {
      router.replace(hrefFor({ ...next, page: next.page }), { scroll: false })
    })
  }

  function clearAll() {
    apply({ ...filters, service: showService ? "" : filters.service, gender: "", price: "", minPrice: undefined, maxPrice: undefined, open: false, sort: "", page: 1 })
    setOpen(false)
  }

  const chips: { key: string; label: string; drop: () => void }[] = []
  if (showService && filters.service) {
    chips.push({ key: "service", label: filters.service, drop: () => apply({ ...filters, service: "", page: 1 }) })
  }
  if (filters.gender) {
    const label = genders.find((item) => item.value === filters.gender)?.label ?? filters.gender
    chips.push({ key: "gender", label, drop: () => apply({ ...filters, gender: "", page: 1 }) })
  }
  if (filters.price) {
    chips.push({
      key: "price",
      label: priceLabel(filters.price) ?? filters.price,
      drop: () => apply({ ...filters, price: "", minPrice: undefined, maxPrice: undefined, page: 1 }),
    })
  }
  if (filters.open) chips.push({ key: "open", label: "Open now", drop: () => apply({ ...filters, open: false, page: 1 }) })
  if (filters.sort === "price-asc") chips.push({ key: "sort", label: "Lowest price", drop: () => apply({ ...filters, sort: "", page: 1 }) })
  if (filters.sort === "price-desc") chips.push({ key: "sort", label: "Highest price", drop: () => apply({ ...filters, sort: "", page: 1 }) })
  if (filters.sort === "nearest") chips.push({ key: "sort", label: "Nearest", drop: () => apply({ ...filters, sort: "", page: 1 }) })

  const serviceOptions = [...services]
  if (filters.service && !serviceOptions.some((item) => item.value === filters.service)) {
    serviceOptions.unshift({ value: filters.service, label: filters.service })
  }

  return (
    <div className="mt-6 min-w-0">
      <div className="grid min-w-0 gap-3">
        {showService && services.length > 0 ? (
          <div className="grid gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Service</p>
            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
              {services.map((item) => {
                const on = filters.service === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={on}
                    className={chipClass(on)}
                    onClick={() => apply({ ...filters, service: on ? "" : item.value, page: 1 })}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
        <div className="grid gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Price</p>
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
            {PRICE_BANDS.filter((band) => band.value !== "ANY").map((band) => {
              const on = filters.price === band.value
              return (
                <button
                  key={band.value}
                  type="button"
                  aria-pressed={on}
                  className={chipClass(on)}
                  onClick={() =>
                    apply({
                      ...filters,
                      price: on ? "" : band.value,
                      page: 1,
                    })
                  }
                >
                  {band.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={filters.open}
            className={chipClass(filters.open)}
            onClick={() => apply({ ...filters, open: !filters.open, page: 1 })}
          >
            Open now
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex h-11 items-center rounded-full bg-sage px-4 text-sm font-semibold text-foreground">
            Filters ({count})
          </DialogTrigger>
          <DialogContent placement="sheet">
            <DialogHeader className="pr-12">
              <DialogTitle className="font-heading text-2xl">Filters</DialogTitle>
              <DialogDescription>These stay in the page address, so back returns to the previous list.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              {showService ? (
                <label className="grid gap-1.5 text-sm font-medium">
                  Service
                  <select
                    className={field}
                    value={filters.service}
                    onChange={(event) => apply({ ...filters, service: event.target.value, page: 1 })}
                  >
                    <option value="">Any service</option>
                    {serviceOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="grid gap-1.5 text-sm font-medium">
                Price
                <select
                  className={field}
                  value={filters.price || "ANY"}
                  onChange={(event) => apply({ ...filters, price: event.target.value === "ANY" ? "" : event.target.value, page: 1 })}
                >
                  {PRICE_BANDS.map((band) => (
                    <option key={band.value} value={band.value}>
                      {band.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Who is it for?
                <select
                  className={field}
                  value={filters.gender}
                  onChange={(event) =>
                    apply({ ...filters, gender: event.target.value as PublicFilters["gender"], page: 1 })
                  }
                >
                  {genders.map((item) => (
                    <option key={item.label} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  className="size-11"
                  checked={filters.open}
                  onChange={(event) => apply({ ...filters, open: event.target.checked, page: 1 })}
                />
                Open now
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Sort
                <select
                  className={field}
                  value={filters.sort}
                  onChange={(event) => apply({ ...filters, sort: event.target.value as PublicFilters["sort"], page: 1 })}
                >
                  <option value="">Suggested</option>
                  <option value="price-asc">Lowest price</option>
                  <option value="price-desc">Highest price</option>
                  {near ? <option value="nearest">Nearest</option> : null}
                </select>
              </label>
              <button type="button" onClick={clearAll} className="inline-flex h-12 items-center justify-center rounded-xl border border-border text-sm font-medium">
                Clear all
              </button>
            </div>
          </DialogContent>
        </Dialog>
        <label className="sr-only" htmlFor="directory-sort">
          Sort
        </label>
        <select
          id="directory-sort"
          className="h-11 rounded-full border border-border bg-card px-3 text-sm"
          value={filters.sort}
          onChange={(event) => apply({ ...filters, sort: event.target.value as PublicFilters["sort"], page: 1 })}
        >
          <option value="">Suggested</option>
          <option value="price-asc">Lowest price</option>
          <option value="price-desc">Highest price</option>
          {near ? <option value="nearest">Nearest</option> : null}
        </select>
      </div>
      {chips.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={chip.drop}
                className="inline-flex h-11 items-center rounded-full bg-blush-soft px-3 text-sm font-medium text-foreground"
                aria-label={`Remove ${chip.label}`}
              >
                {chip.label}
                <span aria-hidden="true" className="ml-2">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {resultSummary(total, parts)}
      </p>
      {pending ? (
        <div className="mt-4">
          <SalonSkeletons />
        </div>
      ) : salons.length === 0 ? (
        <EmptyState
          empty={empty}
          filtered={filtered}
          chips={chips}
          onClear={clearAll}
        />
      ) : (
        <>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} distanceKm={salon.distanceKm} />
            ))}
          </ul>
          {hasMore ? (
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "mt-4 h-12 w-full text-base")}
              onClick={() => apply({ ...filters, page: filters.page + 1 })}
            >
              Show more
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}

function EmptyState({
  empty,
  filtered,
  chips,
  onClear,
}: {
  empty: {
    kind: "area" | "city" | "service" | "radius"
    areaName?: string
    cityName: string
    cityHref: string
    serviceName?: string
    nearby?: { href: string; name: string }[]
    widenHref?: string
    radiusKm?: number | null
  }
  filtered: boolean
  chips: { key: string; label: string; drop: () => void }[]
  onClear: () => void
}) {
  if (filtered) {
    return (
      <div className="mt-4 rounded-2xl bg-card px-4 py-12 text-center shadow-card ring-1 ring-border">
        <p className="font-heading text-2xl">Nothing matches those filters</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.drop}
              className="inline-flex h-11 items-center rounded-full border border-border px-3 text-sm font-medium"
            >
              Drop {chip.label}
            </button>
          ))}
          <button type="button" onClick={onClear} className={cn(buttonVariants(), "h-11 px-4")}>
            Clear all
          </button>
        </div>
      </div>
    )
  }
  if (empty.kind === "radius") {
    return (
      <div className="mt-4 rounded-2xl bg-card px-4 py-12 text-center shadow-card ring-1 ring-border">
        <p className="font-heading text-2xl">No salons within {empty.radiusKm} km</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {empty.widenHref ? (
            <Link href={empty.widenHref} className={cn(buttonVariants(), "h-11 px-4")}>
              Widen radius
            </Link>
          ) : null}
          <Link href={empty.cityHref} className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}>
            Browse {empty.cityName}
          </Link>
        </div>
      </div>
    )
  }
  if (empty.kind === "service") {
    return (
      <div className="mt-4 rounded-2xl bg-card px-4 py-12 text-center shadow-card ring-1 ring-border">
        <p className="font-heading text-2xl">No {empty.serviceName?.toLowerCase()} listings yet</p>
        <Link href={empty.cityHref} className={cn(buttonVariants({ variant: "outline" }), "mt-4 h-11 px-4")}>
          All salons in {empty.cityName}
        </Link>
      </div>
    )
  }
  const place = empty.kind === "area" ? empty.areaName : empty.cityName
  return (
    <div className="mt-4 rounded-2xl bg-card px-4 py-12 text-center shadow-card ring-1 ring-border">
      <p className="font-heading text-2xl">No salons listed in {place} yet</p>
      {empty.nearby && empty.nearby.length > 0 ? (
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {empty.nearby.map((area) => (
            <li key={area.href}>
              <Link href={area.href} className="inline-flex h-11 items-center rounded-full border border-border px-3 text-sm">
                {area.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <Link href="/partner/setup" className={cn(buttonVariants(), "mt-4 h-11 px-4")}>
        Own a salon here? List free
      </Link>
    </div>
  )
}
