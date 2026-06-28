"use client";
import { useEffect, useRef, useState } from "react";

export interface DonutSlice {
  key: string;
  value: number;
  color: string;
}

// Animated donut. Segments sweep in clockwise on mount; hovering a slice
// (chart or legend) lifts it and shows its share in the hole.
export default function DonutChart({
  data,
  size = 200,
  thickness = 26,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
}) {
  const [progress, setProgress] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setProgress(1);
      return;
    }
    let start: number | null = null;
    const dur = 1000;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setProgress(ease(p));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [data]);

  const total = data.reduce((acc, d) => acc + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;

  if (total === 0) {
    return <p className="text-sm text-[var(--mute)]">No data</p>;
  }

  let acc = 0;
  const segments = data.map((d, i) => {
    const frac = d.value / total;
    const startFrac = acc;
    acc += frac;
    return { ...d, i, frac, startFrac };
  });

  const center = hover !== null ? segments[hover] : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--paper)" strokeWidth={thickness} />
          {segments.map((s) => {
            const visible = s.frac * progress * C;
            const offset = -s.startFrac * progress * C;
            const lifted = hover === s.i;
            return (
              <circle
                key={s.key}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={lifted ? thickness + 4 : thickness}
                strokeDasharray={`${visible} ${C - visible}`}
                strokeDashoffset={offset}
                style={{
                  transition: "stroke-width 0.3s var(--ease)",
                  cursor: "pointer",
                  opacity: hover === null || lifted ? 1 : 0.4,
                }}
                onMouseEnter={() => setHover(s.i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        {/* center readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="font-mono-num text-2xl font-semibold text-[var(--ink)]">
            {center ? center.value : total}
          </div>
          <div className="max-w-[80px] text-[10px] uppercase tracking-[0.12em] text-[var(--mute)]">
            {center ? center.key : "Total"}
          </div>
        </div>
      </div>

      {/* legend */}
      <ul className="w-full space-y-2">
        {segments.map((s) => (
          <li
            key={s.key}
            className="flex cursor-pointer items-center justify-between gap-3 text-sm transition-opacity duration-150"
            style={{ opacity: hover === null || hover === s.i ? 1 : 0.4 }}
            onMouseEnter={() => setHover(s.i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="flex items-center gap-2 truncate text-[var(--ink)]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="truncate">{s.key}</span>
            </span>
            <span className="font-mono-num shrink-0 text-[var(--slate)]">
              {Math.round(s.frac * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
