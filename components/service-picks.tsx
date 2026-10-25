"use client"

import { useState } from "react"
import type { SuggestedService } from "@/lib/suggested-services"
import { cn } from "@/lib/utils"

export function ServicePicks({
  services,
  savedPrices,
  invalid = false,
}: {
  services: SuggestedService[]
  savedPrices: Record<string, number>
  invalid?: boolean
}) {
  const categories = Array.from(new Set(services.map((service) => service.category)))
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
    </div>
  )
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
