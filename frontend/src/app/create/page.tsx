"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { keccak256, parseUnits, toBytes } from "viem";
import { ARCLOCK_CONTRACT_ADDRESS, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/chains";
import { arcLockAbi, erc20Abi } from "@/lib/arclockAbi";
import { createCommitment, fundCommitment } from "@/lib/api";

type Step = "idle" | "saving" | "approving" | "creating" | "funding" | "done" | "error";

export default function CreateCommitmentPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [conditionsText, setConditionsText] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setErrorMsg] = useState<string | null>(null);
  const [backendId, setBackendId] = useState<string | null>(null);

  const conditions = conditionsText
    .split("\n")
    .map((c) => c.trim())
    .filter(Boolean);

  // Minimum lead time before a deadline is accepted, kept in sync with the
  // backend's assertFutureDeadline check and the on-chain InvalidDeadline
  // guard in ArcLock.createCommitment (deadline must be > block.timestamp).
  const MIN_DEADLINE_LEAD_MINUTES = 1;
  const minDeadlineLocal = (() => {
    const d = new Date(Date.now() + MIN_DEADLINE_LEAD_MINUTES * 60 * 1000);
    d.setSeconds(0, 0);
    // datetime-local inputs expect "YYYY-MM-DDTHH:mm" in local time.
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!address) {
      setErrorMsg("Connect your wallet first.");
      return;
    }
    if (!ARCLOCK_CONTRACT_ADDRESS) {
      setErrorMsg(
        "NEXT_PUBLIC_ARCLOCK_CONTRACT_ADDRESS is not configured. Deploy the contract and set it in .env."
      );
      return;
    }

    const deadlineSeconds = Math.floor(new Date(deadline).getTime() / 1000);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!deadline || Number.isNaN(deadlineSeconds) || deadlineSeconds <= nowSeconds + 60) {
      setErrorMsg("Deadline must be at least a minute in the future.");
      return;
    }

    try {
      setStep("saving");
      const { commitmentId } = await createCommitment({
        payer: address,
        recipient,
        amount: parseUnits(amount, USDC_DECIMALS).toString(),
        description,
        deadline: deadlineSeconds.toString(),
        conditions,
        verificationMethod: "deterministic",
      });
      setBackendId(commitmentId);

      const amountOnchain = parseUnits(amount, USDC_DECIMALS);
      const conditionHash = keccak256(toBytes(description + JSON.stringify(conditions)));

      setStep("approving");
      const approveHash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [ARCLOCK_CONTRACT_ADDRESS, amountOnchain],
      });
      await publicClient?.waitForTransactionReceipt({ hash: approveHash });

      setStep("creating");
      const createHash = await writeContractAsync({
        address: ARCLOCK_CONTRACT_ADDRESS,
        abi: arcLockAbi,
        functionName: "createCommitment",
        args: [
          recipient as `0x${string}`,
          address, // verifier defaults to payer for the MVP self-verification flow
          amountOnchain,
          BigInt(deadlineSeconds),
          conditionHash,
        ],
      });
      const createReceipt = await publicClient?.waitForTransactionReceipt({ hash: createHash });

      // Pull the on-chain commitmentId out of the CommitmentCreated event.
      const createdLog = createReceipt?.logs.find(
        (log) => log.address.toLowerCase() === ARCLOCK_CONTRACT_ADDRESS.toLowerCase()
      );
      const onchainId = createdLog?.topics[1] ? BigInt(createdLog.topics[1]).toString() : "unknown";

      setStep("funding");
      const fundHash = await writeContractAsync({
        address: ARCLOCK_CONTRACT_ADDRESS,
        abi: arcLockAbi,
        functionName: "fundCommitment",
        args: [BigInt(onchainId)],
      });
      await publicClient?.waitForTransactionReceipt({ hash: fundHash });

      await fundCommitment(commitmentId, onchainId);

      setStep("done");
      router.push(`/commitments/${commitmentId}`);
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || "Something went wrong.");
      setStep("error");
    }
  }

  const stepLabels: Record<Step, string> = {
    idle: "Create Commitment",
    saving: "Saving commitment…",
    approving: "Approving USDC…",
    creating: "Creating on-chain commitment…",
    funding: "Locking USDC…",
    done: "Done",
    error: "Retry",
  };

  const progressSteps: { key: Step; label: string }[] = [
    { key: "saving", label: "Save" },
    { key: "approving", label: "Approve" },
    { key: "creating", label: "Create" },
    { key: "funding", label: "Lock" },
  ];
  const stepIndex = progressSteps.findIndex((s) => s.key === step);
  const isBusy = step !== "idle" && step !== "error" && step !== "done";

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 text-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-arc-violet/30 bg-arc-violet/10 px-3 py-1 text-xs font-medium text-arc-violet">
          New commitment
        </span>
        <h1 className="text-3xl font-bold tracking-tight">Lock USDC against an outcome</h1>
        <p className="mt-2 text-sm text-white/50">
          Define what success looks like. The contract holds the funds until it's proven.
        </p>
      </div>

      {!isConnected && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <span>⚠️</span>
          Connect your wallet to create and fund a commitment on Arc.
        </div>
      )}

      {isBusy && (
        <div className="mb-6 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          {progressSteps.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                  i < stepIndex
                    ? "bg-emerald-500/80 text-white"
                    : i === stepIndex
                    ? "bg-arc-gradient text-white"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {i < stepIndex ? "✓" : i + 1}
              </div>
              <span className={`text-xs ${i <= stepIndex ? "text-white/80" : "text-white/35"}`}>
                {s.label}
              </span>
              {i < progressSteps.length - 1 && <div className="h-px flex-1 bg-white/10" />}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card flex flex-col gap-5 p-6 sm:p-8">
        <div>
          <label className="field-label">Recipient wallet address</label>
          <input
            required
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="field-input font-mono"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label">Amount (USDC)</label>
            <div className="relative">
              <input
                required
                type="number"
                min="0"
                step="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                className="field-input pr-14"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-white/35">
                USDC
              </span>
            </div>
          </div>
          <div>
            <label className="field-label">Deadline</label>
            <input
              required
              type="datetime-local"
              min={minDeadlineLocal}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="field-input"
            />
          </div>
        </div>

        <div>
          <label className="field-label">Description</label>
          <input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Build a landing page"
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label">Conditions (one per line)</label>
          <textarea
            value={conditionsText}
            onChange={(e) => setConditionsText(e.target.value)}
            rows={4}
            placeholder={"Website deployed\nGitHub repository submitted"}
            className="field-input resize-none"
          />
          {conditions.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {conditions.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                  <span className="text-emerald-400">✓</span> {c}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isConnected || isBusy}
          className="btn-primary w-full !py-3.5 text-base"
        >
          {isBusy && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {stepLabels[step]}
        </button>

        {backendId && step !== "idle" && (
          <p className="text-center font-mono text-xs text-white/35">
            Backend commitment id: {backendId}
          </p>
        )}
      </form>
    </div>
  );
}
