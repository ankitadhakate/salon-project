import type { NextConfig } from "next";

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
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
