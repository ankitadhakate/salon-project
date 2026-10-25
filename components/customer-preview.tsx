import Link from "next/link"
import { SalonPublicView } from "@/components/salon-public"
import { buttonVariants } from "@/components/ui/button"
import { statusLabel } from "@/lib/format"
import type { OwnerSalon } from "@/lib/salons"
import { cn } from "@/lib/utils"

export function CustomerPreview({ salon }: { salon: OwnerSalon }) {
  const href = `/${salon.citySlug}/${salon.areaSlug}/${salon.slug}?preview=1`
  const live = salon.status === "LIVE"
  return (
    <section id="customer-preview" className="mt-10">
      <h2 className="font-heading text-3xl">See how customers see your listing</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {live
          ? "This is the public page, narrowed to a phone. Opening it while you are logged in does not add a view."
          : `Customers cannot open this yet (${statusLabel(salon.status).toLowerCase()}). The frame below is the real page.`}
      </p>
      <div className="mx-auto mt-4 h-[70vh] max-h-[760px] w-full max-w-[390px] overflow-auto overscroll-contain rounded-[2rem] bg-background ring-1 ring-foreground/15">
        <SalonPublicView salon={salon} embedded preview={!live} />
      </div>
      <p className="mt-3 text-center">
        <Link href={href} className={cn(buttonVariants({ variant: "outline" }), "h-12 px-4 text-base")}>
          Open the customer page
        </Link>
      </p>
    </section>
  )
}
