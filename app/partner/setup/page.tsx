import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { signup } from "@/app/auth/actions"
import { submitListing, uploadPhotos } from "@/app/dashboard/actions"
import { saveContactStep, saveSalonStep, saveServicesStep } from "@/app/partner/actions"
import { CityLocalityFields } from "@/components/city-locality-fields"
import { PinPicker } from "@/components/pin-picker"
import { Flash } from "@/components/flash"
import { SignupMagicForm } from "@/components/magic-forms"
import { SetupProgress } from "@/components/setup-progress"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSessionUser } from "@/lib/auth"
import { listActiveCities } from "@/lib/places"
import { getOwnerSalon, type OwnerSalon } from "@/lib/salons"
import { SUGGESTED_SERVICES, setupStep, type SetupStep } from "@/lib/suggested-services"

export const metadata: Metadata = {
  title: "Set up your salon",
  robots: { index: false, follow: false },
}

const field = "h-12 px-3 text-base md:text-base"
const laterSteps = ["salon", "contact", "services", "photos"] as const

function resumeStep(salon: OwnerSalon | null): SetupStep {
  if (!salon) return "salon"
  if (salon.latitude == null || salon.longitude == null) return "salon"
  if (!salon.whatsapp) return "contact"
  if (salon.services.length === 0) return "services"
  return "photos"
}

export default async function PartnerSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; error?: string; notice?: string; ref?: string }>
}) {
  const sp = await searchParams
  const user = await getSessionUser()
  if (user?.role === "ADMIN") redirect("/admin")
  const ref = sp.ref?.trim() ?? ""
  const safeRef = /^[A-Za-z0-9-]{0,32}$/.test(ref) ? ref : ""

  let step: SetupStep = "account"
  let salon: OwnerSalon | null = null
  if (!user) {
    step = "account"
  } else {
    salon = await getOwnerSalon(user.id)
    const resume = resumeStep(salon)
    const requested = sp.step ? setupStep(sp.step) : resume
    const resumeIndex = laterSteps.indexOf(resume as (typeof laterSteps)[number])
    const requestedIndex = laterSteps.indexOf(requested as (typeof laterSteps)[number])
    if (!sp.step || requested === "account" || requestedIndex < 0 || requestedIndex > resumeIndex) {
      step = resume
    } else {
      step = requested
    }
  }

  const cities = step === "salon" ? await listActiveCities() : []
  const priceByName = new Map((salon?.services ?? []).map((service) => [`${service.category}:${service.name}`, service.priceInr]))

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <SetupProgress step={step} />
      <p className="mt-3 text-sm text-muted-foreground">About five minutes. You can leave and come back.</p>
      <div className="mt-4">
        <Flash notice={sp.notice?.slice(0, 240)} error={sp.error?.slice(0, 240)} />
      </div>

      {step === "account" ? (
        <form action={signup} className="mt-6 grid gap-4">
          <h1 className="font-heading text-3xl">Your account</h1>
          <p className="text-sm text-muted-foreground">
            This is a partner login. Customers never create an account.
            {!user && sp.step && sp.step !== "account" ? " Create the account first, then the salon steps open." : ""}
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" autoComplete="name" required className={field} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required className={field} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={field} />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="referralCode">Referral code</Label>
            <Input id="referralCode" name="referralCode" defaultValue={safeRef} placeholder="Optional" className={field} />
          </div>
          <SubmitButton pendingLabel="Creating account…" className="h-12 text-base">
            Continue
          </SubmitButton>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Email me a link instead</summary>
            <div className="mt-3">
              <SignupMagicForm referralCode={safeRef} />
            </div>
          </details>
          <p className="text-sm">
            Already listed?{" "}
            <Link href="/partner/login" className="font-medium text-primary">
              Log in
            </Link>
          </p>
        </form>
      ) : null}

      {step === "salon" ? (
        <form action={saveSalonStep} className="mt-6 grid gap-4">
          <h1 className="font-heading text-3xl">The salon</h1>
          <p className="text-sm text-muted-foreground">Name, where it is, and a pin on the map. Hours start at 10:00–20:00, Monday to Saturday.</p>
          <div className="grid gap-1.5">
            <Label htmlFor="salon-name">Salon name</Label>
            <Input id="salon-name" name="name" required defaultValue={salon?.name ?? ""} className={field} />
          </div>
          <CityLocalityFields
            cities={cities.map((city) => ({ slug: city.slug, name: city.name, localities: city.localities }))}
            citySlug={salon?.citySlug}
            areaSlug={salon?.areaSlug}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="gender">Who is it for?</Label>
            <select
              id="gender"
              name="gender"
              defaultValue={salon?.gender ?? "UNISEX"}
              className="h-12 w-full rounded-lg border border-input bg-card px-3 text-base"
            >
              <option value="UNISEX">Everyone</option>
              <option value="WOMEN">Women</option>
              <option value="MEN">Men</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="address">Street address</Label>
            <Input id="address" name="address" required defaultValue={salon?.address ?? ""} autoComplete="street-address" className={field} />
          </div>
          <PinPicker latitude={salon?.latitude ?? null} longitude={salon?.longitude ?? null} />
          <SubmitButton pendingLabel="Saving…" className="h-12 text-base">
            Continue
          </SubmitButton>
        </form>
      ) : null}

      {step === "contact" && salon ? (
        <form action={saveContactStep} className="mt-6 grid gap-4">
          <h1 className="font-heading text-3xl">How customers reach you</h1>
          <p className="text-sm text-muted-foreground">WhatsApp is the button on your page. A phone number is optional.</p>
          <div className="grid gap-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" name="whatsapp" inputMode="tel" autoComplete="tel" required defaultValue={salon.whatsapp} placeholder="10-digit mobile" className={field} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" inputMode="tel" autoComplete="tel" defaultValue={salon.phone} placeholder="Optional" className={field} />
          </div>
          <SubmitButton pendingLabel="Saving…" className="h-12 text-base">
            Continue
          </SubmitButton>
          <Link href="/partner/setup?step=salon" className="text-sm font-medium text-primary">
            Back
          </Link>
        </form>
      ) : null}

      {step === "services" && salon ? (
        <form action={saveServicesStep} className="mt-6 grid gap-5">
          <div>
            <h1 className="font-heading text-3xl">Services and prices</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tick what you offer. The price is a suggestion — change it before you continue. You can add other services later.
            </p>
          </div>
          {Array.from(new Set(SUGGESTED_SERVICES.map((service) => service.category))).map((category) => (
            <fieldset key={category} className="grid gap-3">
              <legend className="font-medium">{category}</legend>
              {SUGGESTED_SERVICES.map((service, index) => {
                if (service.category !== category) return null
                const saved = priceByName.get(`${service.category}:${service.name}`)
                return (
                  <label key={service.name} className="flex items-center gap-3 rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10">
                    <input
                      type="checkbox"
                      name={`pick-${index}`}
                      defaultChecked={saved != null}
                      className="size-5 accent-primary"
                    />
                    <span className="flex-1 text-sm">{service.name}</span>
                    <span className="text-sm text-muted-foreground">₹</span>
                    <input
                      name={`price-${index}`}
                      inputMode="numeric"
                      defaultValue={saved ?? service.priceInr}
                      aria-label={`${service.name} price in rupees`}
                      className="h-12 w-24 rounded-lg border border-input bg-background px-2 text-base tabular-nums"
                    />
                  </label>
                )
              })}
            </fieldset>
          ))}
          <SubmitButton pendingLabel="Saving…" className="h-12 text-base">
            Continue
          </SubmitButton>
          <Link href="/partner/setup?step=contact" className="text-sm font-medium text-primary">
            Back
          </Link>
        </form>
      ) : null}

      {step === "photos" && salon ? (
        <div className="mt-6 grid gap-4">
          <h1 className="font-heading text-3xl">Photos</h1>
          <p className="text-sm text-muted-foreground">
            Add at least 3. The chairs, the street outside, and the work. JPG, PNG, or WebP, under 5 MB each.
          </p>
          <p className="text-sm font-medium">
            {salon.photos.length} of 3 photos so far.
            {salon.photos.length < 3 ? ` Add ${3 - salon.photos.length} more before you submit.` : " You can submit."}
          </p>
          {salon.photos.length ? (
            <ul className="grid grid-cols-3 gap-2">
              {salon.photos.map((photo) => (
                <li key={photo.id} className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.alt || salon.name} className="aspect-square w-full object-cover" />
                </li>
              ))}
            </ul>
          ) : null}
          <form action={uploadPhotos} className="grid gap-3">
            <input type="hidden" name="next" value="setup" />
            <Label htmlFor="photos">Upload photos</Label>
            <Input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required className="h-12 pt-2 text-base" />
            <SubmitButton pendingLabel="Uploading…" className="h-12 text-base">
              Add photos
            </SubmitButton>
          </form>
          <form action={submitListing}>
            <input type="hidden" name="next" value="setup" />
            <SubmitButton disabled={salon.photos.length < 3} pendingLabel="Submitting…" className="h-12 w-full text-base">
              Submit listing
            </SubmitButton>
          </form>
          <p className="text-sm text-muted-foreground">
            A new listing waits in the review queue. Speciality, brands, parking, and hours are on the{" "}
            <Link href="/partner/edit" className="font-medium text-primary">
              full editor
            </Link>
            .
          </p>
          <Link href="/partner/setup?step=services" className="text-sm font-medium text-primary">
            Back
          </Link>
        </div>
      ) : null}
    </div>
  )
}
