"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Client-side wrapper for next-themes ThemeProvider.
 * Configured with class attribute strategy for Tailwind CSS dark mode.
 * Default theme is "dark" per PRD spec; system preference is also enabled.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
