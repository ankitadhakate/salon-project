"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function PhoneField({
  id,
  name,
  label,
  dialCode,
  defaultValue = "",
  required = false,
  placeholder = "",
  invalid = false,
  autoComplete = "tel",
  watchCity = false,
  cities = [],
}: {
  id: string
  name: string
  label: string
  dialCode: string
  defaultValue?: string
  required?: boolean
  placeholder?: string
  invalid?: boolean
  autoComplete?: string
  watchCity?: boolean
  cities?: { slug: string; dialCode: string }[]
}) {
  const [code, setCode] = useState(dialCode)
  useEffect(() => {
    if (!watchCity) return
    const select = document.getElementById("citySlug")
    if (!(select instanceof HTMLSelectElement)) return
    const sync = () => {
      const next = cities.find((city) => city.slug === select.value)?.dialCode
      if (next) setCode(next)
    }
    sync()
    select.addEventListener("change", sync)
    return () => select.removeEventListener("change", sync)
  }, [cities, watchCity])

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex">
        <span className="inline-flex h-12 items-center rounded-l-lg border border-input border-r-0 bg-muted px-3 text-sm">
          +{code || dialCode}
        </span>
        <Input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          data-field={name}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "form-error" : undefined}
          className={cn("h-12 rounded-l-none px-3 text-base md:text-base")}
        />
      </div>
    </div>
  )
}
