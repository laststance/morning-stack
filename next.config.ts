import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Next.js Image optimization — whitelist external thumbnail domains. */
  images: {
    remotePatterns: [
      // Allow all HTTPS images — articles from Hatena, RSS, and other
      // aggregated sources reference OGP thumbnails on arbitrary domains
      // that cannot be enumerated ahead of time.
      { protocol: "https", hostname: "**" },
    ],
    /** Limit generated sizes to common breakpoints to reduce build cache. */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    /** Cache optimized images for 1 hour, stale for up to 1 day. */
    minimumCacheTTL: 3600,
  },

  /** HTTP headers for caching and security. */
  async headers() {
    return [
      {
        // Static assets — immutable CDN caching (Next.js hashes filenames)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Optimized images — cache for 1 day with stale-while-revalidate
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Cron API — no caching, server-to-server only
        source: "/api/cron/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        // Security headers for all pages
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
