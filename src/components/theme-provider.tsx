"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ThemePreference = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  cyclePreference: () => void;
};

const STORAGE_KEY = "dtrminelabs-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "dark" || value === "light";
}

function resolvePreference(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyPreference(preference: ThemePreference): ResolvedTheme {
  const resolvedTheme = resolvePreference(preference);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themePreference = preference;
  return resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const preferenceRef = useRef<ThemePreference>("system");

  useEffect(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(STORAGE_KEY); } catch { /* System theme remains available without storage. */ }
    const initialPreference = isPreference(stored) ? stored : "system";
    preferenceRef.current = initialPreference;
    setPreferenceState(initialPreference);
    setResolvedTheme(applyPreference(initialPreference));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (preferenceRef.current === "system") setResolvedTheme(applyPreference("system"));
    };
    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    preferenceRef.current = next;
    setPreferenceState(next);
    setResolvedTheme(applyPreference(next));
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* The current page still follows the selected theme. */ }
  }, []);

  const cyclePreference = useCallback(() => {
    const next: ThemePreference = preference === "system" ? "dark" : preference === "dark" ? "light" : "system";
    setPreference(next);
  }, [preference, setPreference]);

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference, cyclePreference }), [preference, resolvedTheme, setPreference, cyclePreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider.");
  return context;
}
