import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Next.js Image optimization — whitelist external thumbnail domains. */
  images: {
    remotePatterns: [
      // GitHub — owner avatars from Search API
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // Reddit — post thumbnails
      { protocol: "https", hostname: "i.redd.it" },
      { protocol: "https", hostname: "b.thumbs.redditmedia.com" },
      { protocol: "https", hostname: "preview.redd.it" },
      // YouTube — video thumbnails
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "i9.ytimg.com" },
      // ProductHunt — product thumbnails
      { protocol: "https", hostname: "ph-files.imgix.net" },
      { protocol: "https", hostname: "ph-static.imgix.net" },
      // Hatena — bookmark entry images
      { protocol: "https", hostname: "b.st-hatena.com" },
      { protocol: "https", hostname: "cdn-ak.b.st-hatena.com" },
      // Bluesky — user avatars
      { protocol: "https", hostname: "cdn.bsky.app" },
      { protocol: "https", hostname: "av-cdn.bsky.app" },
      // RSS feeds — images from major tech outlets
      { protocol: "https", hostname: "duet-cdn.vox-cdn.com" },
      { protocol: "https", hostname: "cdn.arstechnica.net" },
      { protocol: "https", hostname: "techcrunch.com" },
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
