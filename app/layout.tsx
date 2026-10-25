import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { allowIndexing } from "@/lib/indexing"
import { siteName } from "@/lib/site"
import { appBaseUrl } from "@/lib/urls"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
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
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
}

export const dynamic = "force-dynamic"

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="absolute -left-[999px] top-2 z-50 inline-flex h-11 items-center rounded-lg bg-card px-3 focus:left-4"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  )
}
