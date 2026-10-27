"use client";
import { useEffect, useState } from "react";

export default function BrandPreloader() {
  const [phase, setPhase] = useState<"enter" | "exit" | null>(null);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("dtrminelabs-preloaded") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      sessionStorage.setItem("dtrminelabs-preloaded", "1");
    } catch { return; }
    setPhase("enter");
    const exit = window.setTimeout(() => setPhase("exit"), 280);
    const done = window.setTimeout(() => setPhase(null), 430);
    return () => { window.clearTimeout(exit); window.clearTimeout(done); };
  }, []);
  if (!phase) return null;
  return <div className={`brand-preloader preloader-${phase}`} aria-hidden="true"><div className="preloader-inner"><span className="preloader-mark"><i/><i/><i/><i/></span><strong>DTRMINELABS</strong><div className="preloader-line"><i/></div><small>UPLOAD TRACKER</small></div></div>;
}
