"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * App-wide theme provider (light / dark).
 *
 * - Toggles the `.dark` class on <html> (see `@custom-variant dark` in
 *   globals.css), so every shadcn CSS variable switches automatically.
 * - Default theme is `light` — the app's original, high-contrast look that
 *   every page/table was built and tested against, so tables stay readable
 *   for everyone. Dark is fully available as an opt-in via the topbar toggle
 *   (and the login screen stays "Dark Premium" independently).
 * - The choice is persisted in localStorage by next-themes, so each user's
 *   preference sticks on their device with no flash on reload.
 */
export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      themes={["light", "dark"]}
      disableTransitionOnChange
      storageKey="langford-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
