"use client";
import { useEffect, useRef, useState } from "react";

// Animated count-up. Ticks 0 → value on the console easing curve.
// Honours prefers-reduced-motion by snapping straight to the value.
export default function CountUp({
  value,
  duration = 700,
  delay = 0,
  decimals = 0,
}: {
  value: number;
  duration?: number;
  delay?: number;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || duration <= 0) {
      setDisplay(value);
      return;
    }

    let start: number | null = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // cubic-out, mirrors our curve

    const timer = window.setTimeout(() => {
      const step = (ts: number) => {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setDisplay(value * ease(p));
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      window.clearTimeout(timer);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration, delay]);

  return <>{display.toFixed(decimals)}</>;
}
