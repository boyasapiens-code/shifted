"use client";

// Top-level error boundary. Catches errors that escape the root layout, reports
// them to Sentry, and renders a calm fallback. It replaces the whole document,
// so styles are inline (Daybreak palette) to stay self-contained.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFF6EC",
          color: "#2B1B2E",
          fontFamily:
            "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#FF6B4A",
              margin: "0 0 0.75rem",
            }}
          >
            Something broke
          </p>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: "0 0 0.5rem",
            }}
          >
            We hit an unexpected error.
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#9A7A6E", margin: "0 0 0.5rem" }}>
            Our team has been notified. Try again in a moment.
          </p>
          <p style={{ fontSize: "0.9rem", color: "#9A7A6E", margin: "0 0 1.75rem" }}>
            เกิดข้อผิดพลาดที่ไม่คาดคิด ทีมงานได้รับแจ้งแล้ว กรุณาลองใหม่อีกครั้ง
          </p>
          <button
            onClick={() => reset()}
            style={{
              border: "none",
              cursor: "pointer",
              backgroundColor: "#FF6B4A",
              color: "#FFF6EC",
              fontWeight: 600,
              fontSize: "0.95rem",
              padding: "0.7rem 1.5rem",
              borderRadius: "9999px",
            }}
          >
            Try again · ลองอีกครั้ง
          </button>
        </main>
      </body>
    </html>
  );
}
