"use client";
import { useEffect, useState } from "react";

export default function BrandPreloader() {
  const [phase, setPhase] = useState<"enter" | "exit" | null>("enter");

  useEffect(() => {
    let exitTimer = 0;
    let finishTimer = 0;
    let readyTimer = 0;
    let cancelled = false;
    let loadListener: (() => void) | null = null;
    const startedAt = performance.now();
    const pageReady = new Promise<void>(resolve => {
      if (document.readyState === "complete") resolve();
      else {
        loadListener = () => resolve();
        window.addEventListener("load", loadListener, { once: true });
      }
    });
    const fontsReady = document.fonts?.ready.then(() => undefined).catch(() => undefined) ?? Promise.resolve();
    const safetyLimit = new Promise<void>(resolve => { readyTimer = window.setTimeout(resolve, 1200); });

    void Promise.race([Promise.all([pageReady, fontsReady]).then(() => undefined), safetyLimit]).then(() => {
      if (loadListener) window.removeEventListener("load", loadListener);
      loadListener = null;
      if (cancelled) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const minimumVisibleMs = reducedMotion ? 0 : 180;
      const remaining = Math.max(0, minimumVisibleMs - (performance.now() - startedAt));
      exitTimer = window.setTimeout(() => {
        if (cancelled) return;
        setPhase("exit");
        finishTimer = window.setTimeout(() => { if (!cancelled) setPhase(null); }, reducedMotion ? 0 : 170);
      }, remaining);
    });

    return () => { cancelled = true; if (loadListener) window.removeEventListener("load", loadListener); window.clearTimeout(readyTimer); window.clearTimeout(exitTimer); window.clearTimeout(finishTimer); };
  }, []);

  if (!phase) return null;
  return <div className={`brand-preloader preloader-${phase}`} aria-hidden="true"><div className="preloader-inner"><span className="preloader-mark"><i /><i /><i /><i /></span><strong>DTRMINELABS</strong><div className="preloader-line"><i /></div><small>UPLOAD TRACKER</small></div></div>;
}
