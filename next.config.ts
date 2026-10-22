import type { NextConfig } from "next";

const extraOrigins = (process.env.ACTION_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The dev indicator sits on top of the pinned Call and WhatsApp bar.
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
      allowedOrigins: extraOrigins,
    },
  },
};

export default nextConfig;
