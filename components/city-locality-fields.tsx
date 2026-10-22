"use client"

import { useState } from "react"

const control =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export type CityOption = {
  slug: string
  name: string
  localities: { slug: string; name: string }[]
}

export function CityLocalityFields({
  cities,
  citySlug,
  areaSlug,
}: {
  cities: CityOption[]
  citySlug?: string
  areaSlug?: string
}) {
  const initial = citySlug && cities.some((city) => city.slug === citySlug) ? citySlug : cities[0]?.slug ?? ""
  const [city, setCity] = useState(initial)
  const localities = cities.find((item) => item.slug === city)?.localities ?? []
  const areaDefault = localities.some((area) => area.slug === areaSlug) ? areaSlug : ""

  return (
    <>
      <div className="grid gap-1.5">
        <label htmlFor="citySlug" className="text-sm font-medium">
          City
        </label>
        <select
          id="citySlug"
          name="citySlug"
          required
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
        <label htmlFor="areaSlug" className="text-sm font-medium">
          Locality
        </label>
        <select id="areaSlug" name="areaSlug" required defaultValue={areaDefault} key={city} className={control}>
          <option value="" disabled>
            Choose a locality
          </option>
          {localities.map((area) => (
            <option key={area.slug} value={area.slug}>
              {area.name}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
