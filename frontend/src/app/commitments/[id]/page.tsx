"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { getCommitment, submitEvidence, verifyCommitment } from "@/lib/api";
import { USDC_DECIMALS, ARC_EXPLORER_URL } from "@/lib/chains";
import { StatusBadge } from "@/components/StatusBadge";

const EVIDENCE_ICON: Record<string, string> = {
  url: "🔗",
  github: "🐙",
  tx_hash: "🧾",
  file: "📄",
  text: "📝",
};

export default function CommitmentDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["commitment", params.id],
    queryFn: () => getCommitment(params.id),
  });

  const [evidenceType, setEvidenceType] = useState<"url" | "github" | "tx_hash">("url");
  const [evidenceValue, setEvidenceValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleSubmitEvidence(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setBusy(true);
    try {
      await submitEvidence(params.id, { type: evidenceType, value: evidenceValue });
      setEvidenceValue("");
      await queryClient.invalidateQueries({ queryKey: ["commitment", params.id] });
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setActionError(null);
    setBusy(true);
    try {
      await verifyCommitment(params.id);
      await queryClient.invalidateQueries({ queryKey: ["commitment", params.id] });
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="shimmer h-24 rounded-xl" />
        <div className="shimmer h-32 rounded-xl" />
        <div className="shimmer h-48 rounded-xl" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="glass-card p-8 text-center text-red-300">Commitment not found.</div>
    );
  }

  const { commitment, evidence, verifications } = data;
  const deadlinePassed = commitment.deadline * 1000 < Date.now();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-arc-radial opacity-50"
        />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={commitment.status} />
            {deadlinePassed && commitment.status !== "SETTLED" && (
              <span className="status-pill bg-red-500/15 text-red-300">
                <span className="status-dot" /> Deadline passed
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{commitment.description}</h1>

          <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Amount" value={`${formatUnits(BigInt(commitment.amount), USDC_DECIMALS)} USDC`} highlight />
            <Metric label="Payer" value={`${commitment.payer.slice(0, 8)}…${commitment.payer.slice(-4)}`} mono />
            <Metric
              label="Recipient"
              value={`${commitment.recipient.slice(0, 8)}…${commitment.recipient.slice(-4)}`}
              mono
            />
            <Metric label="Deadline" value={new Date(commitment.deadline * 1000).toLocaleDateString()} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Conditions */}
        <section className="glass-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/50">
            <span>📋</span> Conditions
          </h2>
          <ul className="flex flex-col gap-2.5">
            {commitment.conditions.map((cond, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-white/80">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] text-emerald-400">
                  ✓
                </span>
                {cond}
              </li>
            ))}
            {commitment.conditions.length === 0 && (
              <li className="text-sm text-white/40">No specific conditions listed.</li>
            )}
          </ul>
        </section>

        {/* Verification */}
        <section className="glass-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/50">
              <span>🧪</span> Verification
            </h2>
            <button
              onClick={handleVerify}
              disabled={busy || commitment.status !== "EVIDENCE_SUBMITTED"}
              className="btn-primary !px-3.5 !py-1.5 text-xs"
            >
              Run Verification
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {verifications.map((v) => (
              <div
                key={v.id}
                className={`rounded-lg border p-4 text-sm ${
                  v.result === "PASS"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-red-500/20 bg-red-500/5"
                }`}
              >
                <p
                  className={`mb-2 font-semibold ${v.result === "PASS" ? "text-emerald-400" : "text-red-400"}`}
                >
                  {v.result === "PASS" ? "✅ PASS" : "❌ FAIL"}
                </p>
                <ul className="flex flex-col gap-1">
                  {v.checks.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                      <span className={c.passed ? "text-emerald-400" : "text-red-400"}>
                        {c.passed ? "✓" : "✗"}
                      </span>
                      <span>
                        <span className="font-mono text-white/70">{c.name}</span> — {c.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {verifications.length === 0 && (
              <p className="text-sm text-white/40">
                Not yet verified. Submit evidence, then run verification.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Evidence */}
      <section className="glass-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/50">
          <span>🗂️</span> Evidence
        </h2>

        <ul className="mb-5 flex flex-col gap-2.5">
          {evidence.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3"
            >
              <span className="text-base">{EVIDENCE_ICON[ev.type] ?? "📎"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-white/40">
                  {ev.type.replace("_", " ")}
                </p>
                <p className="truncate font-mono text-sm text-white/80">{ev.value}</p>
              </div>
            </li>
          ))}
          {evidence.length === 0 && (
            <li className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/40">
              No evidence submitted yet.
            </li>
          )}
        </ul>

        <form onSubmit={handleSubmitEvidence} className="flex flex-col gap-2 sm:flex-row">
          <select
            value={evidenceType}
            onChange={(e) => setEvidenceType(e.target.value as typeof evidenceType)}
            className="field-input sm:w-40"
          >
            <option value="url">URL</option>
            <option value="github">GitHub repo</option>
            <option value="tx_hash">Transaction hash</option>
          </select>
          <input
            value={evidenceValue}
            onChange={(e) => setEvidenceValue(e.target.value)}
            placeholder="https://..."
            className="field-input flex-1"
          />
          <button disabled={busy || !evidenceValue} className="btn-primary sm:w-auto">
            Submit
          </button>
        </form>
      </section>

      {actionError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionError}
        </div>
      )}

      {commitment.onchainId && (
        <a
          href={`${ARC_EXPLORER_URL}/address/${commitment.onchainId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start font-mono text-xs text-white/35 underline-offset-4 hover:text-white/60 hover:underline"
        >
          On-chain commitment ID: {commitment.onchainId} ↗
        </a>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-white/35">{label}</p>
      <p
        className={`mt-1 truncate text-sm font-semibold ${mono ? "font-mono" : ""} ${
          highlight ? "text-gradient text-base" : "text-white/85"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
