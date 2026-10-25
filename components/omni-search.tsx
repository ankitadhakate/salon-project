"use client"

import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { PLACE_STORAGE_KEY, parseSavedPlace } from "@/lib/discovery"
import { groupSuggestions, type SuggestHit } from "@/lib/suggest"

export function OmniSearch({
  compact = false,
  initial = "",
  embedded = false,
  status = "",
}: {
  compact?: boolean
  initial?: string
  embedded?: boolean
  status?: string
}) {
  const router = useRouter()
  const listId = useId()
  const [q, setQ] = useState(initial)
  const [hits, setHits] = useState<SuggestHit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const term = q.trim()
    if (!active || term.length < 2) {
      if (!active) setHits([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { hits: [] }))
        .then((body: { hits?: SuggestHit[] }) => {
          setHits(body.hits ?? [])
          setOpen(true)
        })
        .catch(() => {})
    }, 400)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [q, active])

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener("pointerdown", onPointer)
    return () => window.removeEventListener("pointerdown", onPointer)
  }, [])

  function go(next: string) {
    const params = new URLSearchParams(next.split("?")[1] ?? "")
    const path = next.split("?")[0] || "/search"
    if (!params.has("lat")) {
      const saved = parseSavedPlace(localStorage.getItem(PLACE_STORAGE_KEY))
      if (saved && path === "/search") {
        params.set("lat", saved.lat.toFixed(5))
        params.set("lng", saved.lng.toFixed(5))
        params.set("km", String(saved.km))
        params.set("place", saved.label)
      }
    }
    const query = params.toString()
    router.push(query ? `${path}?${query}` : path)
    setOpen(false)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    const term = q.trim()
    if (term) params.set("q", term)
    const saved = parseSavedPlace(localStorage.getItem(PLACE_STORAGE_KEY))
    if (saved) {
      params.set("lat", saved.lat.toFixed(5))
      params.set("lng", saved.lng.toFixed(5))
      params.set("km", String(saved.km))
      params.set("place", saved.label)
    }
    const query = params.toString()
    router.push(query ? `/search?${query}` : "/search")
    setOpen(false)
  }

  const groups = groupSuggestions(hits)
  const sections = [
    ["Places", groups.places],
    ["Salons", groups.salons],
    ["Services", groups.services],
  ] as const
  const shown = open && hits.length > 0

  return (
    <div ref={box} className="relative min-w-0">
      <form
        onSubmit={onSubmit}
        className={embedded ? "flex w-full flex-col gap-3" : "flex min-w-0 items-center gap-2"}
        role="search"
      >
        <label className="sr-only" htmlFor={`${listId}-q`}>
          Search salons, services, and areas
        </label>
        <div
          className={
            embedded
              ? "hero-search-bar relative w-full rounded-2xl bg-white shadow-[0_18px_50px_rgb(0_0_0/0.28)]"
              : "relative min-w-0 flex-1"
          }
        >
          <Search className={`pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 ${embedded ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
          <input
            id={`${listId}-q`}
            value={q}
            onChange={(event) => {
              setActive(true)
              setQ(event.target.value)
            }}
            onFocus={() => setActive(true)}
            placeholder={embedded ? "Search for a salon or a service" : "Search haircut, facial, bridal makeup"}
            autoComplete="off"
            role="combobox"
            aria-expanded={shown}
            aria-controls={listId}
            aria-autocomplete="list"
            className={`w-full pr-3 pl-10 ${
              embedded
                ? "h-14 bg-transparent text-base outline-none"
                : `rounded-full bg-card shadow-card ring-1 ring-border ${compact ? "h-10 text-sm" : "h-14 text-base"}`
            }`}
          />
        </div>
        {embedded && status ? (
          <p className="text-center text-sm text-white/80" role="status">
            {status}
          </p>
        ) : null}
        <button
          type="submit"
          className={
            embedded
              ? "press mx-auto h-12 w-full rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground sm:w-auto"
              : `press shrink-0 rounded-full bg-primary font-semibold text-primary-foreground ${compact ? "h-10 px-3 text-sm" : "h-14 px-5"}`
          }
        >
          Search
        </button>
      </form>
      {shown ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-2xl bg-card p-2 shadow-card ring-1 ring-border"
        >
          {sections.map(([title, items]) =>
            items.length === 0 ? null : (
              <li key={title}>
                <p className="px-2 pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
                <ul>
                  {items.map((hit) => (
                    <li key={`${hit.kind}-${hit.label}-${hit.hint}`}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-2 text-left hover:bg-blush"
                        onClick={() => go(hit.href)}
                      >
                        <span className="font-medium">{hit.label}</span>
                        <span className="truncate text-sm text-muted-foreground">{hit.hint}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ),
          )}
        </ul>
      ) : null}
    </div>
  )
}
