import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "MorningStack - Your morning briefing, curated";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Generate the Open Graph image for the MorningStack home page.
 *
 * Uses Next.js `ImageResponse` to render a branded card with the
 * product name, tagline, and accent color. Served as a static asset
 * after the first generation (cached at the edge).
 */
export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#0D0D0D",
          color: "#FFFFFF",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "60px 80px",
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            display: "flex",
            width: "80px",
            height: "6px",
            backgroundColor: "#FF6B35",
            borderRadius: "3px",
            marginBottom: "40px",
          }}
        />

        {/* Logo / Title */}
        <div
          style={{
            display: "flex",
            fontSize: "72px",
            fontWeight: 700,
            letterSpacing: "-2px",
            lineHeight: 1.1,
          }}
        >
          MorningStack
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: "28px",
            fontWeight: 400,
            color: "#A0A0A0",
            marginTop: "20px",
            textAlign: "center",
          }}
        >
          Your morning briefing, curated
        </div>

        {/* Source badges */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "48px",
            justifyContent: "center",
          }}
        >
          {[
            "HackerNews",
            "GitHub",
            "Reddit",
            "Tech RSS",
            "YouTube",
            "Bluesky",
            "Hatena",
          ].map((source) => (
            <div
              key={source}
              style={{
                display: "flex",
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #333333",
                backgroundColor: "#1A1A1A",
                fontSize: "16px",
                color: "#A0A0A0",
              }}
            >
              {source}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
