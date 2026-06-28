"use client";

// Tiny inline-SVG trend line that draws itself on mount.
export default function Sparkline({
  data,
  color = "var(--mint)",
  width = 120,
  height = 32,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} />;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const pad = 3;
  const usable = height - pad * 2;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = pad + usable - ((v - min) / span) * usable;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const len = points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const [px, py] = points[i - 1];
    return acc + Math.hypot(p[0] - px, p[1] - py);
  }, 0);

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="chart-line"
        style={{ ["--dash-len" as string]: len, strokeDasharray: len }}
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={2.5}
        fill={color}
        className="animate-fade"
        style={{ animationDelay: "1.2s" }}
      />
    </svg>
  );
}
