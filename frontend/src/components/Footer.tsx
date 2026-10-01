import { ARC_EXPLORER_URL, activeNetwork } from "@/lib/chains";

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-white/40 sm:flex-row sm:px-6">
        <p>
          🔐 ARCLOCK FLOW · Programmable USDC commitments, settled on{" "}
          <span className="text-white/60">Arc {activeNetwork === "mainnet" ? "Mainnet" : "Testnet"}</span>
        </p>
        <div className="flex items-center gap-4">
          <a href={ARC_EXPLORER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white/70">
            Arc Explorer ↗
          </a>
          <a
            href="https://www.arc.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/70"
          >
            Built on Arc ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
