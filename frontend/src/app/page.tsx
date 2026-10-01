import Link from "next/link";

const steps = [
  {
    icon: "🔏",
    title: "Commit",
    body: "Define the recipient, USDC amount, deadline, and the conditions that must be met.",
  },
  {
    icon: "🔒",
    title: "Lock",
    body: "USDC is escrowed by the ArcLock smart contract on Arc — never by a backend you have to trust.",
  },
  {
    icon: "📄",
    title: "Prove",
    body: "The recipient does the work and submits evidence: a URL, a GitHub repo, a transaction hash.",
  },
  {
    icon: "✅",
    title: "Settle",
    body: "Verified outcomes release USDC automatically. Failed or expired ones refund the payer.",
  },
];

const useCases = [
  { title: "Freelancing", body: "Pay on verified delivery, not promises." },
  { title: "Bug bounties", body: "Reward valid vulnerability reports automatically." },
  { title: "Data marketplaces", body: "Release payment once a dataset is validated." },
  { title: "AI agents", body: "Agent-to-agent payments settled on outcomes, not trust." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-24">
      {/* Hero */}
      <section className="relative flex flex-col items-start gap-6 overflow-hidden py-10 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-[420px] w-[420px] rounded-full bg-arc-violet/25 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 left-1/3 h-[320px] w-[320px] rounded-full bg-arc-blue/20 blur-[120px]"
        />

        <span className="relative z-10 inline-flex items-center gap-2 rounded-full border border-arc-violet/30 bg-arc-violet/10 px-3.5 py-1.5 text-xs font-medium text-arc-violet animate-fade-up">
          <span className="h-1.5 w-1.5 rounded-full bg-arc-violet animate-pulse-slow" />
          Built on Arc · Settled in USDC
        </span>

        <h1 className="relative z-10 max-w-3xl text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl animate-fade-up [animation-delay:80ms]">
          What if money moved only{" "}
          <span className="text-gradient">when the promise was proven?</span>
        </h1>

        <p className="relative z-10 max-w-xl text-lg text-white/60 animate-fade-up [animation-delay:160ms]">
          ARCLOCK FLOW lets humans and autonomous agents lock USDC against verifiable
          outcomes and automatically settle payments on Arc. No escrow platform. No
          intermediary. Just a smart contract and a proof.
        </p>

        <div className="relative z-10 flex flex-wrap gap-3 animate-fade-up [animation-delay:240ms]">
          <Link href="/create" className="btn-primary">
            Create Commitment
            <span aria-hidden>→</span>
          </Link>
          <Link href="/commitments" className="btn-secondary">
            Explore Commitments
          </Link>
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-xs text-white/40 animate-fade-up [animation-delay:320ms]">
          <span>USDC-native settlement</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>Non-custodial escrow</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>Deterministic verification</span>
        </div>
      </section>

      {/* Lifecycle strip */}
      <section>
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">
            How it works
          </h2>
          <p className="hidden font-mono text-xs text-white/30 sm:block">
            Commit → Lock → Prove → Verify → Settle
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="glass-card group relative flex flex-col gap-3 p-6 transition-all hover:-translate-y-1 hover:shadow-glow-sm"
            >
              <span className="absolute right-5 top-5 font-mono text-xs text-white/20">
                0{i + 1}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-xl">
                {step.icon}
              </span>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-white/55">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Flow diagram */}
      <section className="glass-card relative overflow-hidden p-8 sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-arc-radial opacity-60"
        />
        <div className="relative z-10 flex flex-col gap-6">
          <h2 className="text-lg font-semibold">From promise to programmable settlement</h2>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {["Payer locks USDC", "Recipient delivers + submits evidence", "Engine verifies", "Contract settles"].map(
              (label, i, arr) => (
                <div key={label} className="flex flex-1 items-center gap-3">
                  <div className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center text-sm text-white/75">
                    {label}
                  </div>
                  {i < arr.length - 1 && (
                    <span className="hidden text-white/25 sm:block" aria-hidden>
                      →
                    </span>
                  )}
                </div>
              )
            )}
          </div>
          <p className="max-w-2xl text-sm text-white/50">
            Instead of pay-then-trust or work-then-hope, ARCLOCK FLOW turns a promise into a
            programmable financial state. The contract — not a company — decides where the
            USDC goes.
          </p>
        </div>
      </section>

      {/* Use cases */}
      <section>
        <h2 className="mb-8 text-sm font-semibold uppercase tracking-wider text-white/40">
          Built for
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((uc) => (
            <div key={uc.title} className="glass-card p-5">
              <h3 className="mb-1.5 text-sm font-semibold text-white/90">{uc.title}</h3>
              <p className="text-sm text-white/50">{uc.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="glass-card relative overflow-hidden p-10 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-arc-gradient opacity-[0.08]"
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold">Lock your first commitment on Arc</h2>
          <p className="max-w-md text-sm text-white/50">
            Define an outcome, lock the USDC, and let the contract handle the rest.
          </p>
          <Link href="/create" className="btn-primary mt-2">
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
