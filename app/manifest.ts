import type { MetadataRoute } from "next"
import { siteName } from "@/lib/site"

export default function manifest(): MetadataRoute.Manifest {
  const name = siteName()
  return {
    name,
    short_name: name,
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#f4efe6",
  }
}
