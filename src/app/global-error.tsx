"use client";

// Global error boundary — required by Next.js so Sentry can capture
// errors that crash the root layout. Without this file, Next falls back
// to a built-in 500 page and Sentry never sees the exception.

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
    <html lang="ar" dir="rtl">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            في خطأ غير متوقع
          </h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            الفريق الفني تم إبلاغه تلقائياً. جرّب تحديث الصفحة.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#0070f3",
              color: "#fff",
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            حاول مرة تانية
          </button>
        </div>
      </body>
    </html>
  );
}
