"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export function SalonGallery({ photos }: { photos: { id: string; url: string; alt: string }[] }) {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)
  const count = photos.length
  const current = photos[index] ?? photos[0]

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") setIndex((item) => (item + 1) % count)
      if (event.key === "ArrowLeft") setIndex((item) => (item - 1 + count) % count)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, count])

  function onScroll() {
    const node = scroller.current
    if (!node) return
    const children = [...node.children] as HTMLElement[]
    let best = 0
    let bestDelta = Number.POSITIVE_INFINITY
    children.forEach((child, childIndex) => {
      const delta = Math.abs(child.offsetLeft - node.scrollLeft)
      if (delta < bestDelta) {
        bestDelta = delta
        best = childIndex
      }
    })
    setIndex(best)
  }

  if (!current) return null

  return (
    <div className="relative">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto"
      >
        {photos.map((photo, photoIndex) => (
          <button
            key={photo.id}
            type="button"
            className="h-64 w-[86%] shrink-0 snap-center overflow-hidden rounded-2xl sm:h-96 sm:w-full"
            onClick={() => {
              setIndex(photoIndex)
              setOpen(true)
            }}
            aria-label={`Open photo ${photoIndex + 1} of ${count}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.alt}
              width={1600}
              height={1000}
              loading={photoIndex === 0 ? "eager" : "lazy"}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
      <p className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-foreground/80 px-3 py-1 text-sm font-medium text-background">
        {index + 1}/{count}
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent placement="full">
          <DialogTitle className="sr-only">
            Photo {index + 1} of {count}
          </DialogTitle>
          <button
            type="button"
            className="absolute top-1/2 left-3 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background text-foreground"
            aria-label="Previous photo"
            onClick={() => setIndex((item) => (item - 1 + count) % count)}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="absolute top-1/2 right-3 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background text-foreground"
            aria-label="Next photo"
            onClick={() => setIndex((item) => (item + 1) % count)}
          >
            <ChevronRight />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.alt}
            width={1600}
            height={1000}
            className="max-h-[80dvh] w-full object-contain"
            onTouchStart={(event) => {
              touchX.current = event.changedTouches[0]?.clientX ?? null
            }}
            onTouchEnd={(event) => {
              const start = touchX.current
              const end = event.changedTouches[0]?.clientX
              if (start == null || end == null) return
              if (start - end > 40) setIndex((item) => (item + 1) % count)
              if (end - start > 40) setIndex((item) => (item - 1 + count) % count)
            }}
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-background">
            {index + 1}/{count}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
