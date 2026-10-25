import Link from "next/link"
import {
  addService,
  deletePhoto,
  deleteService,
  makeCover,
  saveHours,
  saveProfile,
  setPassword,
  submitListing,
  updateService,
  uploadPhotos,
} from "@/app/dashboard/actions"
import { CityLocalityFields, type CityOption } from "@/components/city-locality-fields"
import { PinPicker } from "@/components/pin-picker"
import { DAYS, SERVICE_CATEGORIES } from "@/lib/constants"
import type { SessionUser } from "@/lib/auth"
import { siteName } from "@/lib/site"
import { formatDuration, inr, statusLabel } from "@/lib/format"
import type { OwnerSalon } from "@/lib/salons"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PhoneField } from "@/components/phone-field"
import { SubmitButton } from "@/components/submit-button"

const control =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
      <h2 className="font-heading text-2xl">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function ListingEditor({
  salon,
  user,
  cities,
}: {
  salon: OwnerSalon | null
  user: SessionUser
  cities: CityOption[]
}) {
  const publicPath = salon ? `/${salon.citySlug}/${salon.areaSlug}/${salon.slug}` : ""
  const brand = siteName()
  const ready = Boolean(
    salon?.name && salon.address && salon.whatsapp && salon.services.length > 0 && salon.photos.length >= 3,
  )
  const dialCities = cities.flatMap((city) => (city.dialCode ? [{ slug: city.slug, dialCode: city.dialCode }] : []))

  return (
    <div className="grid gap-4">
      {salon ? (
        <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="mt-1 font-heading text-3xl">{statusLabel(salon.status)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {salon.status === "DRAFT" &&
              "Only you can see this. Submit when the price list and WhatsApp number are in."}
            {salon.status === "PENDING" &&
              `With the ${brand} team for a quick check. You can still edit it.`}
            {salon.status === "LIVE" &&
              "Customers can find this page. Everyday edits show straight away. Name, phone, WhatsApp, photos, and anything in the first 30 days wait for a review."}
            {salon.status === "HIDDEN" &&
              "Hidden from search. Update it, then submit again when you want it reviewed."}
          </p>
          <p className="mt-3 text-sm">
            <Link href={publicPath} className="font-medium text-primary underline-offset-4 hover:underline">
              {salon.status === "LIVE" ? "View public page" : "Preview page"}
            </Link>
            <span className="text-muted-foreground"> · {publicPath}</span>
          </p>
          {salon.isEarlyPartner ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Early partner badge is on. It marks salons that joined during the free launch.
            </p>
          ) : null}
          {salon.isDemo ? (
            <p className="mt-3 text-sm text-muted-foreground">
              This is a sample listing for development, not a real salon.
            </p>
          ) : null}
        </section>
      ) : null}

      <Section
        title={salon ? "Salon details" : "Start your listing"}
        hint={`Your name on ${brand}, the city and locality it should appear under, and how customers reach you.`}
      >
        <form action={saveProfile} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Salon name</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={salon?.name ?? ""}
              className="h-12 px-3 text-base md:text-base"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CityLocalityFields
              cities={cities}
              citySlug={salon?.citySlug}
              areaSlug={salon?.areaSlug}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="gender">Who is it for?</Label>
              <select
                id="gender"
                name="gender"
                defaultValue={salon?.gender ?? "UNISEX"}
                className={control}
              >
                <option value="WOMEN">Women</option>
                <option value="MEN">Men</option>
                <option value="UNISEX">Unisex</option>
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              required
              defaultValue={salon?.address ?? ""}
              placeholder="Shop number, street"
              className="h-12 px-3 text-base md:text-base"
            />
          </div>
          <PinPicker
            latitude={salon?.latitude ?? null}
            longitude={salon?.longitude ?? null}
            mapsUrl={salon?.mapsUrl ?? null}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <PhoneField
              id="whatsapp"
              name="whatsapp"
              label="WhatsApp number"
              dialCode={salon?.city?.dialCode ?? dialCities[0]?.dialCode ?? ""}
              defaultValue={salon?.whatsapp ?? ""}
              placeholder="Mobile number"
              watchCity
              cities={dialCities}
            />
            <PhoneField
              id="phone"
              name="phone"
              label="Call number"
              dialCode={salon?.city?.dialCode ?? dialCities[0]?.dialCode ?? ""}
              defaultValue={salon?.phone ?? ""}
              placeholder="Same as WhatsApp, or another line"
              watchCity
              cities={dialCities}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">About the salon</Label>
            <p className="text-sm text-muted-foreground">
              Mention your speciality, the brands you use, and whether customers can park nearby.
            </p>
            <Textarea
              id="description"
              name="description"
              defaultValue={salon?.description ?? ""}
              placeholder="Colour specialist. We use L'Oréal and Schwarzkopf. Street parking on the lane outside."
              className="min-h-28 text-base md:text-base"
            />
          </div>
          <SubmitButton>{salon ? "Save details" : "Create listing"}</SubmitButton>
        </form>
      </Section>

      {salon ? (
        <>
          <Section
            title="Photos"
            hint="Add at least 3 photos — the chairs, the street outside, and the work. Up to 8. Upload one at a time. The first one is the cover. JPG, PNG, or WebP, under 5 MB. Photos are rotated, resized to 1600px wide, and saved without location data."
          >
            {salon.photos.length < 3 ? (
              <p className="mb-3 text-sm font-medium text-primary">
                {salon.photos.length} of 3 photos so far. Add {3 - salon.photos.length} more.
              </p>
            ) : null}
            {salon.photos.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {salon.photos.map((photo, index) => (
                  <li key={photo.id} className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.alt || salon.name} className="aspect-[4/3] w-full object-cover" />
                    <div className="flex flex-wrap gap-2 p-2">
                      {index === 0 ? (
                        <span className="px-1 text-xs text-muted-foreground">Cover</span>
                      ) : (
                        <form action={makeCover}>
                          <input type="hidden" name="id" value={photo.id} />
                          <SubmitButton variant="outline" pendingLabel="…" className="h-11 px-3 text-sm">
                            Make cover
                          </SubmitButton>
                        </form>
                      )}
                      <form action={deletePhoto}>
                        <input type="hidden" name="id" value={photo.id} />
                        <SubmitButton variant="destructive" pendingLabel="…" className="h-11 px-3 text-sm">
                          Remove
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No photos yet. Three photos is the number to aim for.</p>
            )}
            <form action={uploadPhotos} className="mt-4 grid gap-3">
              <Label htmlFor="photos">Upload photos</Label>
              <Input
                id="photos"
                name="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="h-12 pt-2 text-base"
              />
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                name="caption"
                maxLength={80}
                placeholder="Hair wash station"
                className="h-12 px-3 text-base md:text-base"
              />
              <p className="text-sm text-muted-foreground">Optional. This is the text a screen reader reads for the photo.</p>
              <SubmitButton pendingLabel="Uploading…" className="h-12 text-base">
                Upload
              </SubmitButton>
            </form>
          </Section>

          <Section
            title="Services and prices"
            hint="Customers compare these side by side. Prices are in rupees, durations in minutes."
          >
            {salon.services.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Add at least one service before you submit. Haircut, facial, bridal makeup — whatever you actually offer.
              </p>
            ) : (
              <ul className="mb-6 grid gap-3">
                {salon.services.map((service) => (
                  <li key={service.id} className="rounded-xl border border-border p-3">
                    <form action={updateService} className="grid gap-3">
                      <input type="hidden" name="id" value={service.id} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label htmlFor={`svc-name-${service.id}`}>Service</Label>
                          <Input
                            id={`svc-name-${service.id}`}
                            name="name"
                            defaultValue={service.name}
                            className="h-11 px-3 text-base md:text-base"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`svc-cat-${service.id}`}>Category</Label>
                          <select
                            id={`svc-cat-${service.id}`}
                            name="category"
                            defaultValue={service.category}
                            className={control}
                          >
                            {SERVICE_CATEGORIES.map((category) => (
                              <option key={category}>{category}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`svc-price-${service.id}`}>Price (₹)</Label>
                          <Input
                            id={`svc-price-${service.id}`}
                            name="priceInr"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            enterKeyHint="done"
                            defaultValue={service.priceInr}
                            className="h-11 px-3 text-base md:text-base"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor={`svc-dur-${service.id}`}>Duration (minutes)</Label>
                          <Input
                            id={`svc-dur-${service.id}`}
                            name="durationMin"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            enterKeyHint="done"
                            defaultValue={service.durationMin}
                            className="h-11 px-3 text-base md:text-base"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <SubmitButton className="h-11 px-3">Save</SubmitButton>
                        <span className="text-sm text-muted-foreground">
                          {inr(service.priceInr)} · {formatDuration(service.durationMin)}
                        </span>
                      </div>
                    </form>
                    <form action={deleteService} className="mt-2">
                      <input type="hidden" name="id" value={service.id} />
                      <SubmitButton variant="destructive" className="h-11 px-3">
                        Remove
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addService} className="grid gap-3 rounded-xl bg-secondary/60 p-3">
              <p className="text-sm font-medium">Add a service</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="new-service">Service</Label>
                  <Input id="new-service" name="name" placeholder="Haircut" className="h-11 px-3 text-base md:text-base" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="new-category">Category</Label>
                  <select id="new-category" name="category" defaultValue="Hair" className={control}>
                    {SERVICE_CATEGORIES.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="new-price">Price (₹)</Label>
                  <Input id="new-price" name="priceInr" inputMode="numeric" pattern="[0-9]*" maxLength={6} enterKeyHint="done" placeholder="500" className="h-12 px-3 text-base md:text-base" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="new-duration">Duration (minutes)</Label>
                  <Input id="new-duration" name="durationMin" inputMode="numeric" pattern="[0-9]*" maxLength={4} enterKeyHint="done" placeholder="45" className="h-12 px-3 text-base md:text-base" />
                </div>
              </div>
              <SubmitButton pendingLabel="Adding…">Add service</SubmitButton>
            </form>
          </Section>

          <Section title="Opening hours" hint="Times are in the city's local time.">
            <form action={saveHours} className="grid gap-3">
              {DAYS.map((day, index) => {
                const row = salon.hours.find((hour) => hour.dayOfWeek === index)
                return (
                  <div key={day} className="rounded-xl border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{day}</span>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name={`closed-${index}`}
                          defaultChecked={row?.closed ?? false}
                          className="size-4 accent-primary"
                        />
                        Closed
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        aria-label={`${day} opens`}
                        type="time"
                        name={`open-${index}`}
                        defaultValue={row?.openTime ?? "10:00"}
                        className="h-11 px-2 text-base md:text-base"
                      />
                      <Input
                        aria-label={`${day} closes`}
                        type="time"
                        name={`close-${index}`}
                        defaultValue={row?.closeTime ?? "20:00"}
                        className="h-11 px-2 text-base md:text-base"
                      />
                    </div>
                  </div>
                )
              })}
              <SubmitButton>Save hours</SubmitButton>
            </form>
          </Section>

          <Section title="Go live" hint="Submit when the address, WhatsApp number, and at least one price are in.">
            <ul className="mb-4 grid gap-1 text-sm">
              <li>{salon.address ? "Address added" : "Address still needed"}</li>
              <li>{salon.whatsapp ? "WhatsApp number added" : "WhatsApp number still needed"}</li>
              <li>
                {salon.services.length
                  ? `${salon.services.length} service${salon.services.length === 1 ? "" : "s"} listed`
                  : "At least one service still needed"}
              </li>
              <li>
                {salon.photos.length >= 3
                  ? `${salon.photos.length} photos`
                  : `Add at least 3 photos (${salon.photos.length} so far)`}
              </li>
            </ul>
            {salon.status === "LIVE" ? (
              <p className="text-sm">
                Live in {salon.locality?.name ?? salon.areaSlug}
                {salon.city?.name ? `, ${salon.city.name}` : ""}.{" "}
                <Link href={publicPath} className="font-medium text-primary underline-offset-4 hover:underline">
                  Open the page
                </Link>
              </p>
            ) : (
              <form action={submitListing}>
                <SubmitButton pendingLabel="Submitting…" className="h-12 px-5 text-base" disabled={!ready}>
                  {salon.status === "HIDDEN" ? "Submit again for review" : "Submit for review"}
                </SubmitButton>
              </form>
            )}
          </Section>
        </>
      ) : null}

      {!user.hasPassword ? (
        <Section title="Set a password" hint="You signed up with an email link. A password is useful when you come back.">
          <form action={setPassword} className="grid gap-3 sm:max-w-sm">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" className="h-12 px-3 text-base md:text-base" />
            <SubmitButton>Save password</SubmitButton>
          </form>
        </Section>
      ) : null}
    </div>
  )
}
