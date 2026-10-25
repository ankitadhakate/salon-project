import { addCity, addLocality, addServiceGuide, saveIntro } from "@/app/admin/actions"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { hasTeamIntro, indexMinSalons } from "@/lib/indexing"

type LocalityRow = { id: string; slug: string; name: string; intro: string }
type GuideRow = { id: string; slug: string; name: string; query: string; intro: string }
type CityRow = {
  slug: string
  name: string
  countryCode: string
  intro: string
  localities: LocalityRow[]
  serviceGuides: GuideRow[]
}

const control =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function IntroForm({ kind, id, intro }: { kind: string; id: string; intro: string }) {
  return (
    <form action={saveIntro} className="mt-3 grid gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <Label htmlFor={`intro-${kind}-${id}`}>Intro</Label>
      <Textarea
        id={`intro-${kind}-${id}`}
        name="intro"
        defaultValue={intro}
        placeholder="Written by the team. Leave empty to keep this page out of search."
        className="min-h-24 text-base md:text-base"
      />
      <p className="text-xs text-muted-foreground">
        {hasTeamIntro(intro) ? "Intro is set." : "No intro yet, so this page is not indexable."} Needs at
        least {indexMinSalons()} approved non-sample salons as well, and ALLOW_INDEXING=true.
      </p>
      <SubmitButton className="h-10 w-fit px-3">Save intro</SubmitButton>
    </form>
  )
}

export function AdminDirectory({ cities }: { cities: CityRow[] }) {
  return (
    <section className="mt-12">
      <h2 className="font-heading text-3xl">Cities and pages</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Add a city, then its localities and service pages. Public URLs are /city, /city/locality, and
        /city/service/name. Intros start empty, so new pages stay out of search until you write one.
      </p>

      <form action={addCity} className="mt-6 grid gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
        <h3 className="font-heading text-2xl">Add a city</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="city-name">Name</Label>
            <Input id="city-name" name="name" required className="h-12 px-3 text-base md:text-base" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="city-slug">Slug</Label>
            <Input id="city-slug" name="slug" placeholder="Optional, from the name" className="h-12 px-3 text-base md:text-base" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="country">Country code</Label>
            <Input id="country" name="countryCode" defaultValue="IN" className="h-12 px-3 text-base md:text-base" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dial">Dial code</Label>
            <Input id="dial" name="dialCode" defaultValue="91" className="h-12 px-3 text-base md:text-base" />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="tz">Timezone</Label>
            <Input id="tz" name="timezone" defaultValue="Asia/Kolkata" className="h-12 px-3 text-base md:text-base" />
          </div>
        </div>
        <SubmitButton className="h-11 w-fit px-4">Add city</SubmitButton>
      </form>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form action={addLocality} className="grid gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
          <h3 className="font-heading text-2xl">Add a locality</h3>
          <Label htmlFor="loc-city">City</Label>
          <select id="loc-city" name="citySlug" required className={control} defaultValue={cities[0]?.slug ?? ""}>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
          <Label htmlFor="loc-name">Name</Label>
          <Input id="loc-name" name="name" required className="h-12 px-3 text-base md:text-base" />
          <Label htmlFor="loc-slug">Slug</Label>
          <Input id="loc-slug" name="slug" placeholder="Optional" className="h-12 px-3 text-base md:text-base" />
          <SubmitButton className="h-11 w-fit px-4">Add locality</SubmitButton>
        </form>
        <form action={addServiceGuide} className="grid gap-3 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
          <h3 className="font-heading text-2xl">Add a service page</h3>
          <Label htmlFor="svc-city">City</Label>
          <select id="svc-city" name="citySlug" required className={control} defaultValue={cities[0]?.slug ?? ""}>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>
          <Label htmlFor="svc-name">Name</Label>
          <Input id="svc-name" name="name" required placeholder="Haircut" className="h-12 px-3 text-base md:text-base" />
          <Label htmlFor="svc-query">Match phrase</Label>
          <Input id="svc-query" name="query" placeholder="haircut" className="h-12 px-3 text-base md:text-base" />
          <SubmitButton className="h-11 w-fit px-4">Add service page</SubmitButton>
        </form>
      </div>

      <div className="mt-6 grid gap-4">
        {cities.map((city) => (
          <details key={city.slug} className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
            <summary className="cursor-pointer font-heading text-2xl">
              {city.name}{" "}
              <span className="text-sm font-sans text-muted-foreground">
                /{city.slug} · {city.countryCode}
                {hasTeamIntro(city.intro) ? "" : " · intro needed"}
              </span>
            </summary>
            <IntroForm kind="city" id={city.slug} intro={city.intro} />
            <h4 className="mt-6 text-sm font-medium">Localities</h4>
            <ul className="mt-2 grid gap-3">
              {city.localities.map((area) => (
                <li key={area.id} className="rounded-xl border border-border p-3">
                  <p className="font-medium">
                    {area.name} <span className="text-sm text-muted-foreground">/{city.slug}/{area.slug}</span>
                  </p>
                  <IntroForm kind="locality" id={area.id} intro={area.intro} />
                </li>
              ))}
            </ul>
            <h4 className="mt-6 text-sm font-medium">Service pages</h4>
            <ul className="mt-2 grid gap-3">
              {city.serviceGuides.map((guide) => (
                <li key={guide.id} className="rounded-xl border border-border p-3">
                  <p className="font-medium">
                    {guide.name}{" "}
                    <span className="text-sm text-muted-foreground">
                      /{city.slug}/service/{guide.slug} · matches “{guide.query}”
                    </span>
                  </p>
                  <IntroForm kind="service" id={guide.id} intro={guide.intro} />
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  )
}
