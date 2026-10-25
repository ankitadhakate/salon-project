"use client"

import { useState } from "react"
import { PRICE_BANDS } from "@/lib/filters"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/submit-button"
import type { CityOption } from "@/components/city-locality-fields"
import { cn } from "@/lib/utils"

const control =
  "h-11 w-full rounded-full border border-input bg-card px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const choice =
  "relative inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-blush focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 has-[:checked]:border-transparent has-[:checked]:bg-sage has-[:checked]:text-foreground"

const genders = [
  { value: "ANY", label: "Anyone" },
  { value: "WOMEN", label: "Women" },
  { value: "MEN", label: "Men" },
  { value: "UNISEX", label: "Unisex only" },
]

function ChoiceFields({
  form,
  gender,
  price,
  priceDefaulted,
}: {
  form?: string
  gender: string
  price: string
  priceDefaulted?: boolean
}) {
  return (
    <>
      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-xs font-medium">Who is it for?</legend>
        <p className="mb-2 text-xs text-muted-foreground">Women and Men include unisex salons.</p>
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
          {genders.map((option) => (
            <label key={option.value} className={choice}>
              <input
                form={form}
                type="radio"
                name="gender"
                value={option.value}
                defaultChecked={gender === option.value}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-xs font-medium">Price range</legend>
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
          {PRICE_BANDS.map((band) => (
            <label key={band.value} className={choice}>
              <input
                form={form}
                type="radio"
                name="price"
                value={band.value === "ANY" ? "" : band.value}
                defaultChecked={price === band.value || (band.value === "ANY" && !priceDefaulted)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {band.label}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  )
}

export function SearchForm({
  cities,
  defaults,
  sticky = false,
  bleed = false,
  barClassName,
}: {
  cities: CityOption[]
  defaults?: { city?: string; area?: string; service?: string; gender?: string; price?: string }
  sticky?: boolean
  bleed?: boolean
  barClassName?: string
}) {
  const initial =
    defaults?.city && cities.some((city) => city.slug === defaults.city) ? defaults.city : cities[0]?.slug ?? ""
  const [city, setCity] = useState(initial)
  const localities = cities.find((item) => item.slug === city)?.localities ?? []
  const gender = defaults?.gender || "ANY"
  const price = defaults?.price || "ANY"
  const areaDefault = localities.some((area) => area.slug === defaults?.area) ? defaults?.area : ""
  const formId = sticky ? "salon-finder" : undefined

  const placeFields = (
    <div className="grid grid-cols-2 gap-2">
      <div className="grid gap-1">
        <Label htmlFor="city" className="sr-only">
          City
        </Label>
        <select id="city" aria-label="City" value={city} onChange={(event) => setCity(event.target.value)} className={control}>
          {cities.length === 0 ? <option value="">No cities yet</option> : null}
          {cities.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="area" className="sr-only">
          Locality
        </Label>
        <select id="area" name="area" aria-label="Locality" defaultValue={areaDefault ?? ""} key={city} className={control}>
          <option value="">All localities</option>
          {localities.map((area) => (
            <option key={area.slug} value={area.slug}>
              {area.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )

  const serviceRow = (
    <div className="flex items-center gap-2">
      <Label htmlFor="service" className="sr-only">
        Service
      </Label>
      <Input
        id="service"
        name="service"
        defaultValue={defaults?.service ?? ""}
        placeholder="Haircut, facial, bridal makeup"
        aria-label="Service"
        className="h-12 min-w-0 flex-1 rounded-full px-4 text-base md:text-base"
      />
      <SubmitButton pendingLabel="Searching…" className="h-12 shrink-0 rounded-full px-4 text-base">
        Search
      </SubmitButton>
    </div>
  )

  const choices = (
    <ChoiceFields form={formId} gender={gender} price={price} priceDefaulted={Boolean(defaults?.price)} />
  )

  if (!sticky) {
    return (
      <form action={city ? `/${city}` : "/"} method="get" className="grid min-w-0 gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
        {serviceRow}
        {placeFields}
        {choices}
      </form>
    )
  }

  return (
    <>
      <div
        className={cn(
          "sticky top-[calc(4.25rem+1px)] z-30 bg-background/95 py-3 backdrop-blur",
          bleed ? "-mx-4 px-4" : "px-4",
          barClassName,
        )}
      >
        <form
          id={formId}
          action={city ? `/${city}` : "/"}
          method="get"
          className={cn(
            "grid min-w-0 gap-2 rounded-2xl bg-card p-3 shadow-card ring-1 ring-border",
            bleed ? "" : "mx-auto max-w-5xl",
          )}
        >
          {serviceRow}
          {placeFields}
        </form>
      </div>
      <div className={cn("pt-3", bleed ? "" : "mx-auto max-w-5xl px-4")}>
        <div className="grid min-w-0 gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">{choices}</div>
      </div>
    </>
  )
}
