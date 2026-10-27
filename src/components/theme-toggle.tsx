"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => { setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"); }, []);
  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("dtrminelabs-theme", next); } catch { /* Theme still applies for this page view. */ }
    setTheme(next);
  }
  return <button type="button" className="top-icon theme-toggle" onClick={toggle} aria-label={theme === "dark" ? "Aktifkan tema terang" : "Aktifkan tema gelap"} title={theme === "dark" ? "Tema terang" : "Tema gelap"}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>;
}
