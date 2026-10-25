import type { MetadataRoute } from "next"
import { siteName } from "@/lib/site"

export default function manifest(): MetadataRoute.Manifest {
  const name = siteName()
  return {
    name,
    short_name: name,
    display: "standalone",
    background_color: "#f7ede2",
    theme_color: "#f7ede2",
  }
}
