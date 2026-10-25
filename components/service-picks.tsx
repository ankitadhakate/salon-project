"use client"

import { useState } from "react"
import { SERVICE_CATEGORIES } from "@/lib/constants"
import type { SuggestedService } from "@/lib/suggested-services"
import { cn } from "@/lib/utils"

export type CustomDraft = {
  name: string
  category: string
  price: string
  from: boolean
  duration: string
}

export function ServicePicks({
  services,
  savedPrices,
  customs = [],
  invalid = false,
}: {
  services: SuggestedService[]
  savedPrices: Record<string, number>
  customs?: CustomDraft[]
  invalid?: boolean
}) {
  const categories = Array.from(new Set(services.map((service) => service.category)))
  const [rows, setRows] = useState<CustomDraft[]>(customs)
  return (
    <div className="grid gap-5" aria-invalid={invalid || undefined} aria-describedby={invalid ? "form-error" : undefined}>
      {categories.map((category) => (
        <fieldset key={category} className="grid gap-3">
          <legend className="font-medium">{category}</legend>
          {services.map((service, index) => {
            if (service.category !== category) return null
            return (
              <ServicePick
                key={service.name}
                index={index}
                name={service.name}
                price={savedPrices[`${service.category}:${service.name}`] ?? service.priceInr}
                checked={savedPrices[`${service.category}:${service.name}`] != null}
              />
            )
          })}
        </fieldset>
      ))}
      <div className="grid gap-3" data-custom-services>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">Your own services</h2>
          <button
            type="button"
            className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            onClick={() =>
              setRows((current) =>
                current.length >= 30
                  ? current
                  : [...current, { name: "", category: "Other", price: "", from: false, duration: "" }],
              )
            }
          >
            Add another service
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Anything that is not in the list above. Name, category, and price. “From” and duration are optional.
          </p>
        ) : null}
        {rows.map((row, index) => (
          <div key={index} className="grid gap-3 rounded-xl bg-card p-3 shadow-card ring-1 ring-border">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                Service
                <input
                  name="customName"
                  value={row.name}
                  maxLength={80}
                  onChange={(event) => update(index, { name: event.target.value.slice(0, 80) })}
                  className="h-12 rounded-lg border border-input bg-background px-3 text-base"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                Category
                <select
                  name="customCategory"
                  value={row.category}
                  onChange={(event) => update(index, { category: event.target.value })}
                  className="h-12 rounded-lg border border-input bg-background px-3 text-base"
                >
                  {SERVICE_CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm">
                Price (₹)
                <input
                  name="customPrice"
                  inputMode="numeric"
                  value={row.price}
                  maxLength={6}
                  onChange={(event) => update(index, { price: event.target.value.replace(/\D/g, "").slice(0, 6) })}
                  className="h-12 rounded-lg border border-input bg-background px-3 text-base tabular-nums"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                Duration in minutes
                <input
                  name="customDuration"
                  inputMode="numeric"
                  placeholder="Optional"
                  value={row.duration}
                  maxLength={3}
                  onChange={(event) => update(index, { duration: event.target.value.replace(/\D/g, "").slice(0, 3) })}
                  className="h-12 rounded-lg border border-input bg-background px-3 text-base tabular-nums"
                />
              </label>
            </div>
            <input type="hidden" name="customFrom" value={row.from ? "1" : "0"} />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.from}
                  onChange={(event) => update(index, { from: event.target.checked })}
                  className="size-5 accent-primary"
                />
                Price is “from”
              </label>
              <button
                type="button"
                className="ml-auto h-11 rounded-lg px-3 text-sm font-medium text-destructive"
                onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  function update(index: number, patch: Partial<CustomDraft>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
  }
}

function ServicePick({
  index,
  name,
  price,
  checked,
}: {
  index: number
  name: string
  price: number
  checked: boolean
}) {
  const [on, setOn] = useState(checked)
  const [amount, setAmount] = useState(String(price))
  const boxId = `pick-${index}`
  const priceId = `price-${index}`
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card px-3 py-3 shadow-card ring-1 ring-border">
      <input
        id={boxId}
        type="checkbox"
        name={`pick-${index}`}
        checked={on}
        onChange={(event) => setOn(event.target.checked)}
        className="size-6 accent-primary"
      />
      <label htmlFor={boxId} className="flex-1 text-sm">
        {name}
      </label>
      <label htmlFor={priceId} className="sr-only">
        {name} price in rupees
      </label>
      <span aria-hidden="true" className="text-sm text-muted-foreground">
        ₹
      </span>
      <input
        id={priceId}
        name={`price-${index}`}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        enterKeyHint="done"
        disabled={!on}
        value={amount}
        onChange={(event) => setAmount(event.target.value.replace(/\D/g, "").slice(0, 6))}
        className={cn(
          "h-12 w-24 rounded-lg border border-input bg-background px-2 text-base tabular-nums",
          !on && "opacity-50",
        )}
      />
    </div>
  )
}
