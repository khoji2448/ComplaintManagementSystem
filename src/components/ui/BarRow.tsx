"use client";

// Proportional horizontal bar — width = value / max. Animated fill.
export default function BarRow({
  label,
  value,
  max,
  color = "var(--mint)",
  delay = 0,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  delay?: number;
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm text-[var(--ink)]">{label}</span>
        <span className="font-mono-num text-sm font-medium text-[var(--slate)]">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-[var(--paper)]">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            transition: "width 1s var(--ease)",
          }}
        />
      </div>
    </div>
  );
}
