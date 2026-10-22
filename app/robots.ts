import type { MetadataRoute } from "next"
import { allowIndexing } from "@/lib/indexing"
import { appUrl } from "@/lib/urls"

export const dynamic = "force-dynamic"

export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    }
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/login", "/signup", "/auth"],
    },
    sitemap: appUrl("/sitemap.xml"),
  }
}
