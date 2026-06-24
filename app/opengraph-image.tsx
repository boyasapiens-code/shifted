import { ImageResponse } from "next/og";

export const alt =
  "SHIFTED — The vetted talent network for Hospitality, Retail & Lifestyle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#111111",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "0.18em",
            color: "#999999",
          }}
        >
          SHIFTED
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 28,
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
        >
          <span>Better jobs.</span>
          <span>Better people.</span>
          <span>Better workplaces.</span>
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 30, color: "#d4d4d4" }}>
          The vetted talent network for Hospitality, Retail &amp; Lifestyle.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 14,
            fontSize: 26,
            fontWeight: 600,
            color: "#1166e4",
          }}
        >
          shiftedth.com
        </div>
      </div>
    ),
    { ...size },
  );
}
