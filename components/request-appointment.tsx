"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  appointmentHref,
  appointmentMessage,
  nowMinutes,
  slotsForDay,
  upcomingDays,
} from "@/lib/appointments"
import { inr, type HourRow } from "@/lib/format"

const field =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function RequestAppointment({
  salonName,
  salonId,
  whatsapp,
  dialCode,
  timeZone,
  brand,
  demo = false,
  services,
  hours,
}: {
  salonName: string
  salonId: string
  whatsapp: string
  dialCode: string
  timeZone: string
  brand: string
  demo?: boolean
  services: { id: string; name: string; priceInr: number }[]
  hours: HourRow[]
}) {
  const days = useMemo(() => upcomingDays(timeZone, hours), [timeZone, hours])
  const firstOpen = days.find((day) => !day.closed)?.date ?? ""
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "")
  const [date, setDate] = useState(firstOpen)
  const [slot, setSlot] = useState("")
  const [name, setName] = useState("")
  const selectedDay = days.find((day) => day.date === date)
  const slots = slotsForDay(
    selectedDay && !selectedDay.closed
      ? { closed: false, openTime: selectedDay.openTime, closeTime: selectedDay.closeTime }
      : { closed: true, openTime: "10:00", closeTime: "20:00" },
    { isToday: Boolean(selectedDay && days[0]?.date === selectedDay.date), nowMinutes: nowMinutes(timeZone) },
  )
  const chosenSlot = slots.find((item) => item.value === slot) ?? slots[0]
  const service = services.find((item) => item.id === serviceId) ?? services[0]
  const message =
    service && selectedDay && chosenSlot
      ? appointmentMessage({
          salonName,
          brand,
          serviceName: service.name,
          priceInr: service.priceInr,
          dateLabel: selectedDay.shortLabel,
          timeLabel: chosenSlot.label,
          name,
        })
      : ""
  const href = message ? appointmentHref(whatsapp, dialCode, message) : ""

  if (!whatsapp) return null

  if (demo) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border px-3 text-sm font-medium opacity-60"
        >
          Request appointment
        </button>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Sample listing. Appointment requests stay off so this never messages a real number.
        </p>
      </div>
    )
  }

  function record() {
    if (!salonId) return
    const body = JSON.stringify({ salonId, kind: "appointments" })
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/salon-stats", new Blob([body], { type: "application/json" }))
      return
    }
    void fetch("/api/salon-stats", {
      method: "POST",
      body,
      keepalive: true,
      headers: { "content-type": "application/json" },
    })
  }

  return (
    <Dialog>
      <DialogTrigger className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-medium">
        Request appointment
      </DialogTrigger>
      <DialogContent className="top-auto bottom-0 left-0 max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-2xl rounded-b-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Request appointment</DialogTitle>
          <DialogDescription>
            {brand} doesn&apos;t confirm bookings. The salon replies on WhatsApp.
          </DialogDescription>
        </DialogHeader>
        {services.length === 0 ? (
          <p className="text-sm">This salon has not listed services yet. Ask on WhatsApp instead.</p>
        ) : (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!href) return
              record()
              window.open(href, "_blank", "noopener,noreferrer")
            }}
          >
            <label className="grid gap-1.5 text-sm font-medium">
              Service
              <select className={field} value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                {services.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({inr(item.priceInr)})
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Date
              <select
                className={field}
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                  setSlot("")
                }}
              >
                {days.map((day) => (
                  <option key={day.date} value={day.date} disabled={day.closed}>
                    {day.label}
                    {day.closed ? " (closed)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Time
              <select className={field} value={chosenSlot?.value ?? ""} onChange={(event) => setSlot(event.target.value)}>
                {slots.length === 0 ? <option value="">No slots left this day</option> : null}
                {slots.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Your name (optional)
              <input className={field} value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" />
            </label>
            {message ? (
              <p className="rounded-xl bg-secondary px-3 py-2 text-sm" data-appointment-message>
                {message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!href || slots.length === 0}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-whatsapp px-4 text-base font-medium text-white disabled:opacity-60"
            >
              Send on WhatsApp
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
