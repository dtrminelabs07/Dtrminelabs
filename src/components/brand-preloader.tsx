"use client";
import { useEffect, useState } from "react";

export default function BrandPreloader() {
  const [phase, setPhase] = useState<"enter" | "exit" | null>("enter");

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setPhase("exit"), 360);
    const finishTimer = window.setTimeout(() => {
      setPhase(null);
    }, 520);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
    };
  }, []);

  if (!phase) return null;
  return <div className={`brand-preloader preloader-${phase}`} aria-hidden="true"><div className="preloader-inner"><span className="preloader-mark"><i /><i /><i /><i /></span><strong>DTRMINELABS</strong><div className="preloader-line"><i /></div><small>UPLOAD TRACKER</small></div></div>;
}
