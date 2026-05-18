// Client-side Sentry init. Loaded in the browser bundle.
// DSN comes from NEXT_PUBLIC_SENTRY_DSN — set it in Vercel env vars to activate.
// If the DSN is missing, Sentry no-ops gracefully (no errors thrown).

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1, // 10% of transactions traced
    replaysSessionSampleRate: 0, // off by default
    replaysOnErrorSampleRate: 1.0, // capture a replay only when an error fires
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
    // Don't send noisy network errors from third-party scripts
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
    ],
  });
}
