import type { NextConfig } from "next";
import { IMMUTABLE_CACHE } from "./lib/cache-control";

const extraOrigins = (process.env.ACTION_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["sharp"],
  // The dev indicator sits on top of the pinned Call and WhatsApp bar.
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
      allowedOrigins: extraOrigins,
    },
  },
  async headers() {
    const immutable = [{ key: "Cache-Control", value: IMMUTABLE_CACHE }]
    return [
      { source: "/_next/static/:path*", headers: immutable },
      { source: "/uploads/:path*", headers: immutable },
      { source: "/demo/:path*", headers: immutable },
    ]
  },
};

export default nextConfig;
