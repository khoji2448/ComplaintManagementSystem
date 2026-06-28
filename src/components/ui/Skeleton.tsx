// Pulsing placeholder block. Use to shape content while loading.
export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-none bg-[var(--hairline)] ${className}`}
    />
  );
}
