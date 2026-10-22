import type { Metadata } from "next"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { robotsFor } from "@/lib/indexing"
import { siteName } from "@/lib/site"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const name = siteName()
  return {
    title: "List your salon — free early partner program",
    description: `${name} is free for salon owners during the early partner program. Publish your prices, photos, hours, and WhatsApp number. Customers find you by area.`,
    alternates: { canonical: "/for-salons" },
    robots: robotsFor(true),
  }
}

const faqs = [
  {
    q: "What does it cost?",
    a: "Nothing during the early partner program. Customers never pay to browse either. You keep the full price of every booking, because the booking happens on your WhatsApp or phone.",
  },
  {
    q: "Do I need a website?",
    a: "No. Your page is a clean link like /your-city/your-area/your-salon. You can share it, and it shows up when someone searches that area.",
  },
  {
    q: "When does the page go live?",
    a: "Setup takes about five minutes: account, salon, contact, services, and at least three photos. You submit the listing. A person checks that it looks like a real salon, then it becomes public. The admin can turn that review off later so new listings go live immediately.",
  },
  {
    q: "Can I change prices?",
    a: "Yes, whenever you want. Once the listing is live, edits to prices, hours, and photos show on the public page.",
  },
  {
    q: "What is a referral code?",
    a: "If another salon or a friend invited you, put their code on the signup form. We use it to see which invite brought you in. It doesn't change the price — the listing is free either way.",
  },
]

export default async function ForSalonsPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const ref = (await searchParams).ref?.trim() ?? ""
  const safeRef = /^[A-Za-z0-9-]{0,32}$/.test(ref) ? ref : ""
  const signupHref = safeRef ? `/partner/join?ref=${encodeURIComponent(safeRef)}` : "/partner/join"
  const name = siteName()

  return (
    <div>
      <section className="px-4 pt-10 pb-8 sm:pt-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium tracking-wide text-primary">Early partner program</p>
          <h1 className="mt-2 font-heading text-4xl leading-[1.05] text-balance sm:text-6xl">
            Put your salon on the list. Free while we launch.
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            {name} is a salon directory. You pick your city and locality, then write the listing.
            People nearby compare prices and message you.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={signupHref} className={cn(buttonVariants(), "h-12 px-5 text-base")}>
              Create your free listing
            </Link>
            <Link href="/partner/login" className={cn(buttonVariants({ variant: "outline" }), "h-12 px-5 text-base")}>
              I already have an account
            </Link>
          </div>
          {safeRef ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Referral code <span className="font-medium text-foreground">{safeRef}</span> will be
              attached to your signup.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-8 sm:grid-cols-3">
        {[
          ["Your prices, in rupees", "Haircut, facial, bridal, colour — each with a duration. No lead form in the way."],
          ["An Early partner badge", "Salons that join now are marked on their page, so people can see you were here first."],
          ["WhatsApp enquiries", "A button opens a chat to your number. The directory doesn't take a cut or hold the booking."],
        ].map(([title, body]) => (
          <article key={title} className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <h2 className="font-heading text-2xl">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-4 py-6">
        <h2 className="font-heading text-3xl">How it works</h2>
        <ol className="mt-4 grid gap-4">
          {[
            ["Create an account", "About five minutes, in short steps. Email and password, or an email link. Add a referral code if someone invited you."],
            ["Write the listing", "Name, locality, a WhatsApp number, the services you tick from a price list, and at least three photos."],
            ["Submit it", "It stays private until it's approved. You'll see the status on your dashboard."],
            ["Show up in your area", "Your page lives at /your-city/your-area/your-salon and appears when people search that locality."],
          ].map(([title, body], index) => (
            <li key={title} className="flex gap-4">
              <span className="font-heading text-3xl text-primary">{index + 1}</span>
              <div>
                <h3 className="font-heading text-2xl">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="font-heading text-3xl">Questions</h2>
        <div className="mt-4 divide-y divide-border">
          {faqs.map((faq) => (
            <details key={faq.q} className="group py-3">
              <summary className="cursor-pointer font-medium">{faq.q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
        <Link href={signupHref} className={cn(buttonVariants(), "mt-6 h-12 px-5 text-base")}>
          Start a free listing
        </Link>
      </section>
    </div>
  )
}
