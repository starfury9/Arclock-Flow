"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listCommitments } from "@/lib/api";
import { formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/chains";
import { StatusBadge } from "@/components/StatusBadge";

export default function CommitmentsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["commitments"],
    queryFn: listCommitments,
  });

  const totalLocked = (data?.commitments ?? [])
    .filter((c) => ["FUNDED", "EVIDENCE_SUBMITTED", "VERIFYING", "APPROVED", "REJECTED"].includes(c.status))
    .reduce((sum, c) => sum + Number(formatUnits(BigInt(c.amount), USDC_DECIMALS)), 0);
  const settledCount = (data?.commitments ?? []).filter((c) => c.status === "SETTLED").length;
  const refundedCount = (data?.commitments ?? []).filter((c) =>
    ["REFUNDED", "EXPIRED"].includes(c.status)
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commitments</h1>
          <p className="mt-1 text-sm text-white/50">
            Every outcome-based payment locked, verified, or settled on Arc.
          </p>
        </div>
        <Link href="/create" className="btn-primary">
          <span aria-hidden>+</span> New Commitment
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Locked" value={`${totalLocked.toLocaleString()} USDC`} accent="violet" />
        <StatCard label="Settled" value={settledCount.toString()} accent="emerald" />
        <StatCard label="Refunded / Expired" value={refundedCount.toString()} accent="neutral" />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-20 rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="glass-card p-6 text-sm text-red-300">
          Could not reach the backend. Is it running at the configured NEXT_PUBLIC_BACKEND_URL?
        </div>
      )}

      {data && data.commitments.length === 0 && (
        <div className="glass-card flex flex-col items-center gap-3 p-12 text-center">
          <span className="text-3xl">🔐</span>
          <p className="text-white/60">No commitments yet.</p>
          <Link href="/create" className="btn-secondary mt-1">
            Create the first one
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {data?.commitments.map((c) => (
          <Link
            key={c.id}
            href={`/commitments/${c.id}`}
            className="glass-card group flex items-center justify-between gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-glow-sm"
          >
            <div className="flex items-center gap-4 overflow-hidden">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-lg">
                💼
              </span>
              <div className="overflow-hidden">
                <p className="truncate font-medium text-white/90">{c.description}</p>
                <p className="truncate font-mono text-xs text-white/40">
                  {formatUnits(BigInt(c.amount), USDC_DECIMALS)} USDC · to {c.recipient.slice(0, 10)}…
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StatusBadge status={c.status} />
              <span className="text-white/25 transition-transform group-hover:translate-x-0.5">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "violet" | "emerald" | "neutral";
}) {
  const accentClass =
    accent === "violet" ? "text-arc-violet" : accent === "emerald" ? "text-emerald-400" : "text-white/70";
  return (
    <div className="glass-card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accentClass}`}>{value}</p>
    </div>
  );
}
