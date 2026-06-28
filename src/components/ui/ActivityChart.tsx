"use client";
import { useRef, useState } from "react";

interface Point {
  key: string; // YYYY-MM-DD
  value: number;
}

// Signature element: full-width area chart of daily complaint volume.
// Line draws itself on mount; a crosshair readout snaps to the nearest
// day as the cursor moves across the plot.
export default function ActivityChart({ data }: { data: Point[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 1000;
  const H = 260;
  const padX = 8;
  const padTop = 24;
  const padBottom = 28;

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-[var(--mute)]">
        No activity in this window.
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const plotW = W - padX * 2;
  const plotH = H - padTop - padBottom;
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;

  const xy = (i: number, v: number) => {
    const x = padX + i * stepX;
    const y = padTop + plotH - (v / max) * plotH;
    return [x, y] as const;
  };

  const pts = data.map((d, i) => xy(i, d.value));
  const linePath = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${padTop + plotH} ` +
    `L${pts[0][0].toFixed(1)},${padTop + plotH} Z`;

  const lineLen = pts.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const [px, py] = pts[i - 1];
    return acc + Math.hypot(p[0] - px, p[1] - py);
  }, 0);

  const onMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (e.clientX - rect.left) / rect.width; // 0..1 across container
    const xInView = ratio * W;
    const idx = Math.round((xInView - padX) / (stepX || 1));
    setHover(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const fmtDay = (k: string) => {
    const d = new Date(k);
    return isNaN(d.getTime())
      ? k
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const hx = hover !== null ? pts[hover][0] : 0;
  const hy = hover !== null ? pts[hover][1] : 0;

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[260px] w-full"
      >
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mint)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--mint)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* baseline */}
        <line
          x1={padX}
          y1={padTop + plotH}
          x2={W - padX}
          y2={padTop + plotH}
          stroke="var(--hairline)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {/* area */}
        <path d={areaPath} fill="url(#activityFill)" className="chart-area" />

        {/* line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--mint)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="chart-line"
          style={{ ["--dash-len" as string]: lineLen, strokeDasharray: lineLen }}
        />

        {/* crosshair */}
        {hover !== null && (
          <>
            <line
              x1={hx}
              y1={padTop - 6}
              x2={hx}
              y2={padTop + plotH}
              stroke="var(--signal)"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
              style={{ transition: "all 0.3s var(--ease)" }}
            />
            <circle cx={hx} cy={hy} r={4} fill="var(--mint)" stroke="var(--card)" strokeWidth={2} />
          </>
        )}
      </svg>

      {/* floating readout */}
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap border border-[var(--hairline)] bg-[var(--card)] px-2.5 py-1.5 shadow-[0_4px_16px_rgba(14,17,22,0.12)]"
          style={{
            left: `${(hx / W) * 100}%`,
            transition: "left 0.3s var(--ease)",
          }}
        >
          <div className="font-mono-num text-[10px] uppercase tracking-[0.12em] text-[var(--mute)]">
            {fmtDay(data[hover].key)}
          </div>
          <div className="font-mono-num text-sm font-semibold text-[var(--ink)]">
            {data[hover].value} <span className="text-[var(--mute)]">filed</span>
          </div>
        </div>
      )}

      {/* x-axis endpoints */}
      <div className="mt-1 flex justify-between font-mono-num text-[10px] uppercase tracking-[0.12em] text-[var(--mute)]">
        <span>{fmtDay(data[0].key)}</span>
        <span>{fmtDay(data[data.length - 1].key)}</span>
      </div>
    </div>
  );
}
