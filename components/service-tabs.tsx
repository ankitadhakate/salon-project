"use client"

import { useState } from "react"

export function ServiceTabs({
  groups,
}: {
  groups: { category: string; services: { id: string; name: string; meta: string; price: string }[] }[]
}) {
  const [active, setActive] = useState(groups[0]?.category ?? "")
  const current = groups.find((group) => group.category === active) ?? groups[0]
  if (!current) return <p className="mt-3 text-sm text-muted-foreground">Prices not listed yet — ask on WhatsApp</p>
  return (
    <div className="mt-4">
      <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Price list">
        {groups.map((group) => {
          const selected = group.category === current.category
          return (
            <button
              key={group.category}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`press h-11 shrink-0 rounded-full px-4 text-sm font-medium ${selected ? "bg-sage text-foreground" : "bg-card ring-1 ring-border"}`}
              onClick={() => setActive(group.category)}
            >
              {group.category}
            </button>
          )
        })}
      </div>
      <ul className="mt-2 divide-y divide-border" role="tabpanel">
        {current.services.map((service) => (
          <li key={service.id} className="flex items-baseline justify-between gap-4 py-3">
            <div>
              <p className="font-medium">{service.name}</p>
              <p className="text-sm text-muted-foreground">{service.meta}</p>
            </div>
            <p className="font-medium tabular-nums">{service.price}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
