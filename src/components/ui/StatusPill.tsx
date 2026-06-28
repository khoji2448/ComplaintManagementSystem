// Status token → console color. Shared across complaint surfaces.
export function statusColor(status: string) {
  if (status === "Resolved") return "var(--mint)";
  if (status === "In-Progress") return "var(--signal)";
  if (status === "No Complaint") return "var(--mint)";
  return "var(--slate)";
}

export default function StatusPill({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium"
      style={{ color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}
