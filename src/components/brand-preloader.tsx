"use client";
import { useEffect, useState } from "react";

const sessionKey = "dtrminelabs-preloaded";

export default function BrandPreloader() {
  const [phase, setPhase] = useState<"enter" | "exit" | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(sessionKey)) return;
    } catch {
      // Storage can be unavailable in private browsing; the timed loader still works.
    }

    setPhase("enter");
    const exitTimer = window.setTimeout(() => setPhase("exit"), 280);
    const finishTimer = window.setTimeout(() => {
      setPhase(null);
      try {
        sessionStorage.setItem(sessionKey, "1");
      } catch {
        // Keep the page usable even when session storage is blocked.
      }
    }, 430);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
    };
  }, []);

  if (!phase) return null;
  return <div className={`brand-preloader preloader-${phase}`} aria-hidden="true"><div className="preloader-inner"><span className="preloader-mark"><i /><i /><i /><i /></span><strong>DTRMINELABS</strong><div className="preloader-line"><i /></div><small>UPLOAD TRACKER</small></div></div>;
}
