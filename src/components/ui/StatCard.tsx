"use client";
import { ReactNode } from "react";
import CountUp from "./CountUp";

type Tone = "neutral" | "mint" | "signal";

const toneText: Record<Tone, string> = {
  neutral: "text-[var(--ink)]",
  mint: "text-[var(--mint)]",
  signal: "text-[var(--signal)]",
};

// Compact KPI card. Mono number with count-up, eyebrow label.
export default function StatCard({
  label,
  value,
  tone = "neutral",
  decimals = 0,
  delay = 0,
  alert = false,
  footer,
}: {
  label: string;
  value: number;
  tone?: Tone;
  decimals?: number;
  delay?: number;
  alert?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div
      className="animate-rise border border-[var(--hairline)] bg-[var(--card)] p-4 md:p-5 shadow-[0_1px_2px_rgba(14,17,22,0.04)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--slate)]">
          {label}
        </div>
        {alert && value > 0 && (
          <span className="signal-dot h-2 w-2 rounded-full bg-[var(--signal)]" />
        )}
      </div>
      <div className={`mt-2 font-mono-num text-3xl font-semibold ${toneText[tone]}`}>
        <CountUp value={value} decimals={decimals} delay={delay} />
      </div>
      {footer && <div className="mt-2 text-xs text-[var(--mute)]">{footer}</div>}
    </div>
  );
}
