"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * App-wide theme provider (light / dark).
 *
 * - Toggles the `.dark` class on <html> (see `@custom-variant dark` in
 *   globals.css), so every shadcn CSS variable switches automatically.
 * - Default theme is `dark` (the Langford "Dark Premium" look).
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
      defaultTheme="dark"
      enableSystem={false}
      themes={["light", "dark"]}
      disableTransitionOnChange
      storageKey="langford-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
