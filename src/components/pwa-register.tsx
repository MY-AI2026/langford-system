"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (see `public/sw.js`) once, in production only.
 * Renders nothing. Failures are swallowed — the app works fine without a SW,
 * this only adds offline support + an installable PWA experience.
 */
export function PWARegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support is best-effort */
      });
    };

    // Wait for load so SW registration never competes with first paint.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
