"use client";

import { useEffect, useRef, useState } from "react";

export default function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  useEffect(() => {
    const from = displayRef.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || from === value) {
      displayRef.current = value; setDisplay(value); return;
    }
    let frame = 0; const started = performance.now(); const duration = 360;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (value - from) * eased);
      displayRef.current = next; setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{display.toLocaleString("id-ID")}</>;
}
