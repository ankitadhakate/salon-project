import type { Metadata, Viewport } from "next"
import { Fraunces, Outfit } from "next/font/google"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { allowIndexing } from "@/lib/indexing"
import { getSessionUser } from "@/lib/auth"
import { siteName } from "@/lib/site"
import { appBaseUrl } from "@/lib/urls"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
})

export async function generateMetadata(): Promise<Metadata> {
  const name = siteName()
  return {
    metadataBase: new URL(appBaseUrl()),
    title: {
      default: `${name} — Find a salon`,
      template: `%s · ${name}`,
    },
    description:
      "Find salons by city, area, and service. Haircut, facial, bridal makeup, and more, with prices listed by the salon. Free for customers.",
    applicationName: name,
    robots: allowIndexing() ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: name,
    },
  }
}

export const viewport: Viewport = {
  themeColor: "#f4efe6",
  width: "device-width",
  initialScale: 1,
}

export const dynamic = "force-dynamic"

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser()
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="absolute -left-[999px] top-2 z-50 inline-flex h-11 items-center rounded-lg bg-card px-3 focus:left-4"
        >
          Skip to content
        </a>
        <SiteHeader user={user ? { name: user.name, role: user.role } : null} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  )
}
