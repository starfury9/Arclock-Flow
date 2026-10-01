const STATUS_STYLES: Record<string, string> = {
  CREATED: "bg-white/10 text-white/70",
  FUNDED: "bg-blue-500/15 text-blue-300",
  EVIDENCE_SUBMITTED: "bg-amber-500/15 text-amber-300",
  VERIFYING: "bg-amber-500/15 text-amber-300",
  APPROVED: "bg-emerald-500/15 text-emerald-300",
  REJECTED: "bg-red-500/15 text-red-300",
  SETTLED: "bg-emerald-500/20 text-emerald-300",
  REFUNDED: "bg-white/10 text-white/60",
  EXPIRED: "bg-red-500/15 text-red-300",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-white/10 text-white/70";
  return (
    <span className={`status-pill ${style}`}>
      <span className="status-dot" />
      {status.replace(/_/g, " ")}
    </span>
  );
}
