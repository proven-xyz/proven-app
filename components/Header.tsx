"use client";

import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { shortenAddress } from "@/lib/constants";

export default function Header() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();

  return (
    <header className="sticky top-0 z-50 border-b border-pv-surface bg-pv-bg/92 backdrop-blur-xl">
      <div className="max-w-[640px] mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-display font-bold text-[17px] tracking-tight">
            PROVEN<span className="text-pv-emerald">.</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {isConnected && (
            <>
              <Link
                href="/vs/create"
                className="chip text-pv-cyan border-pv-cyan/15 bg-pv-cyan/[0.06] text-[13px]"
              >
                + Desafiar
              </Link>
              <Link href="/explore" className="chip text-pv-muted text-[13px]">
                Explorar
              </Link>
              <Link href="/dashboard" className="chip text-pv-muted text-[13px]">
                Mis VS
              </Link>
            </>
          )}

          {isConnected ? (
            <button
              onClick={disconnect}
              className="chip font-mono text-[11px] text-pv-emerald border-pv-emerald/12"
            >
              {shortenAddress(address!)}
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="px-4 py-1.5 rounded-[10px] bg-pv-text text-pv-bg text-[13px] font-bold border-none cursor-pointer"
            >
              {isConnecting ? "..." : "Conectar"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
