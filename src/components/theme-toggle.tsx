"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function ThemeToggle() {
  const { preference, resolvedTheme, cyclePreference } = useTheme();
  const preferenceLabel = preference === "system" ? "Sistem" : preference === "dark" ? "Gelap" : "Terang";
  const nextLabel = preference === "system" ? "gelap" : preference === "dark" ? "terang" : "sistem";
  const Icon = preference === "system" ? Monitor : resolvedTheme === "dark" ? Sun : Moon;

  return <button
    type="button"
    className="top-icon theme-toggle"
    onClick={cyclePreference}
    aria-label={`Tema ${preferenceLabel}. Klik untuk beralih ke ${nextLabel}.`}
    title={`Tema ${preferenceLabel} · klik untuk beralih ke ${nextLabel}`}
  ><Icon size={16} /></button>;
}
