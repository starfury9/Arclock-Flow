"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { activeChain } from "@/lib/chains";

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ConnectWalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (isConnected && address) {
    const wrongNetwork = chainId !== activeChain.id;
    return (
      <div className="flex items-center gap-2">
        {wrongNetwork && (
          <button
            onClick={() => switchChain({ chainId: activeChain.id })}
            className="rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/25"
          >
            Switch to {activeChain.name}
          </button>
        )}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-1 py-1">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-arc-gradient text-[10px] font-bold">
            {address.slice(2, 4).toUpperCase()}
          </span>
          <span className="pr-1 font-mono text-sm text-white/90">{truncate(address)}</span>
          <button
            onClick={() => disconnect()}
            className="rounded-full px-2 py-1 text-xs text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Disconnect wallet"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  const connector = connectors[0];
  return (
    <button
      disabled={isPending || !connector}
      onClick={() => connector && connect({ connector, chainId: activeChain.id })}
      className="btn-primary !px-4 !py-2 text-sm"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
