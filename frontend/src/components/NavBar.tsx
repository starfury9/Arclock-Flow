"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { activeNetwork } from "@/lib/chains";

const links = [
  { href: "/commitments", label: "Commitments" },
  { href: "/create", label: "Create" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070b]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-arc-gradient shadow-glow-sm transition-transform group-hover:scale-105">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-base font-bold tracking-tight">
            ARCLOCK <span className="text-gradient">FLOW</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 sm:flex">
            {links.map((link) => {
              const active = pathname === link.href || pathname?.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/50 md:flex">
            <span className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-emerald-400" />
            Arc {activeNetwork === "mainnet" ? "Mainnet" : "Testnet"}
          </span>

          <div className="ml-1">
            <ConnectWalletButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
