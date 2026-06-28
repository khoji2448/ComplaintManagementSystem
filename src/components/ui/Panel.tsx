import { ReactNode } from "react";

// Console surface: hairline border, white card, eyebrow title + optional action.
export default function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-[var(--hairline)] bg-[var(--card)] p-5 md:p-6 shadow-[0_1px_2px_rgba(14,17,22,0.04)] ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-[var(--slate)]">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
