import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Wrap with Sentry. Build-time options:
// - silent: don't log Sentry messages during build (cleaner CI output)
// - hideSourceMaps: don't expose .map files publicly
// - disableLogger: strip Sentry console.log calls from production bundle
//
// If SENTRY_AUTH_TOKEN is not set, source map upload is skipped silently —
// runtime error capture still works fine.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    // Don't ship source maps to the public bundle
    deleteSourcemapsAfterUpload: true,
  },
  disableLogger: true,
  widenClientFileUpload: true,
  // Tunnel Sentry requests through a Next.js route to bypass ad-blockers
  tunnelRoute: "/monitoring",
});
