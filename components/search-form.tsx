import { areasAlphabetical } from "@/lib/areas"
import { PRICE_BANDS } from "@/lib/filters"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/submit-button"

const control =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const genders = [
  { value: "ANY", label: "Anyone" },
  { value: "WOMEN", label: "Women" },
  { value: "MEN", label: "Men" },
  { value: "UNISEX", label: "Unisex only" },
]

export function SearchForm({
  defaults,
}: {
  defaults?: { area?: string; service?: string; gender?: string; price?: string }
}) {
  const areas = areasAlphabetical()
  const gender = defaults?.gender || "ANY"
  const price = defaults?.price || "ANY"
  return (
    <form action="/pune" method="get" className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="area">Area in Pune</Label>
          <select id="area" name="area" defaultValue={defaults?.area ?? ""} className={control}>
            <option value="">All of Pune</option>
            {areas.map((area) => (
              <option key={area.slug} value={area.slug}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="service">Service</Label>
          <Input
            id="service"
            name="service"
            defaultValue={defaults?.service ?? ""}
            placeholder="Haircut, facial, bridal makeup"
            className="h-12 px-3 text-base md:text-base"
          />
        </div>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Who is it for?</legend>
        <p className="mb-2 text-xs text-muted-foreground">Women and Men include unisex salons.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {genders.map((option) => (
            <label
              key={option.value}
              className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-input text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
            >
              <input
                type="radio"
                name="gender"
                value={option.value}
                defaultChecked={gender === option.value}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Price range</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {PRICE_BANDS.map((band) => (
            <label
              key={band.value}
              className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-input px-2 text-center text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
            >
              <input
                type="radio"
                name="price"
                value={band.value === "ANY" ? "" : band.value}
                defaultChecked={price === band.value || (band.value === "ANY" && !defaults?.price)}
                className="sr-only"
              />
              {band.label}
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton pendingLabel="Searching…" className="h-12 w-full text-base sm:w-auto sm:px-6">
        Search salons
      </SubmitButton>
    </form>
  )
}
