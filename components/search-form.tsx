"use client"

import { useState } from "react"
import { PRICE_BANDS } from "@/lib/filters"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/submit-button"
import type { CityOption } from "@/components/city-locality-fields"

const control =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const genders = [
  { value: "ANY", label: "Anyone" },
  { value: "WOMEN", label: "Women" },
  { value: "MEN", label: "Men" },
  { value: "UNISEX", label: "Unisex only" },
]

export function SearchForm({
  cities,
  defaults,
}: {
  cities: CityOption[]
  defaults?: { city?: string; area?: string; service?: string; gender?: string; price?: string }
}) {
  const initial =
    defaults?.city && cities.some((city) => city.slug === defaults.city) ? defaults.city : cities[0]?.slug ?? ""
  const [city, setCity] = useState(initial)
  const localities = cities.find((item) => item.slug === city)?.localities ?? []
  const gender = defaults?.gender || "ANY"
  const price = defaults?.price || "ANY"
  const areaDefault = localities.some((area) => area.slug === defaults?.area) ? defaults?.area : ""

  return (
    <form action={city ? `/${city}` : "/"} method="get" className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="city">City</Label>
          <select
            id="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={control}
          >
            {cities.length === 0 ? <option value="">No cities yet</option> : null}
            {cities.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="area">Locality</Label>
          <select id="area" name="area" defaultValue={areaDefault ?? ""} key={city} className={control}>
            <option value="">All localities</option>
            {localities.map((area) => (
              <option key={area.slug} value={area.slug}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="service">Service</Label>
        <Input
          id="service"
          name="service"
          defaultValue={defaults?.service ?? ""}
          placeholder="Haircut, facial, bridal makeup"
          className="h-12 px-3 text-base md:text-base"
        />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Who is it for?</legend>
        <p className="mb-2 text-xs text-muted-foreground">Women and Men include unisex salons.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {genders.map((option) => (
            <label
              key={option.value}
              className="relative flex h-11 cursor-pointer items-center justify-center rounded-lg border border-input text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
            >
              <input
                type="radio"
                name="gender"
                value={option.value}
                defaultChecked={gender === option.value}
                className="absolute inset-x-0 top-0 h-11 w-full cursor-pointer opacity-0"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Price range</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {PRICE_BANDS.map((band) => (
            <label
              key={band.value}
              className="relative flex h-11 cursor-pointer items-center justify-center rounded-lg border border-input px-2 text-center text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
            >
              <input
                type="radio"
                name="price"
                value={band.value === "ANY" ? "" : band.value}
                defaultChecked={price === band.value || (band.value === "ANY" && !defaults?.price)}
                className="absolute inset-x-0 top-0 h-11 w-full cursor-pointer opacity-0"
              />
              {band.label}
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton pendingLabel="Searching…" className="h-12 w-full text-base sm:w-auto sm:px-6">
        Search salons
      </SubmitButton>
    </form>
  )
}
