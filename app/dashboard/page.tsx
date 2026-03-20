"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { getUserVSList, getVS } from "@/lib/contract";
import type { VSData } from "@/lib/contract";
import { ZERO_ADDRESS, shortenAddress, STATE_LABELS } from "@/lib/constants";

export default function DashboardPage() {
  const { address, isConnected, connect } = useWallet();
  const [duels, setDuels] = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "active" | "done">("all");

  useEffect(() => {
    async function load() {
      if (!address) { setLoading(false); return; }
      try {
        const ids = await getUserVSList(address);
        const results = await Promise.all(ids.map((id) => getVS(id)));
        const valid = results.filter((v): v is VSData => v !== null);
        valid.sort((a, b) => b.id - a.id);
        setDuels(valid);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address]);

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <div className="font-display text-3xl font-bold text-pv-emerald mb-3">PROVEN.</div>
        <p className="text-pv-muted mb-5">Conectá tu wallet para ver tus VS.</p>
        <button onClick={connect} className="btn-primary w-auto inline-block px-8">Conectar</button>
      </div>
    );
  }

  const filtered =
    tab === "all" ? duels :
    tab === "active" ? duels.filter((d) => d.state === "open" || d.state === "accepted") :
    duels.filter((d) => d.state === "resolved" || d.state === "cancelled");

  const won = duels.filter((d) => d.state === "resolved" && d.winner.toLowerCase() === address!.toLowerCase()).length;
  const lost = duels.filter((d) => d.state === "resolved" && d.winner !== ZERO_ADDRESS && d.winner.toLowerCase() !== address!.toLowerCase()).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Mis VS</h1>
          <p className="font-mono text-xs text-pv-muted mt-1">{duels.length} total · {won}W · {lost}L</p>
        </div>
        <Link
          href="/vs/create"
          className="chip text-pv-cyan border-pv-cyan/15 bg-pv-cyan/[0.06] text-[13px] font-bold"
        >
          + Nuevo
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { l: "Todos", v: "all" as const },
          { l: "Activos", v: "active" as const },
          { l: "Resueltos", v: "done" as const },
        ]).map(({ l, v }) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`chip text-sm ${
              tab === v
                ? "bg-pv-text/[0.06] text-pv-text border-pv-text/10"
                : "text-pv-muted"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-pv-muted text-sm">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="font-display text-xl font-bold text-pv-emerald mb-2">PROVEN.</div>
          <p className="text-pv-muted mb-5">No hay VS acá</p>
          <Link href="/vs/create" className="btn-primary w-auto inline-block px-8 text-center">
            Desafiar a alguien
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((vs) => {
            const iWon = vs.state === "resolved" && vs.winner.toLowerCase() === address!.toLowerCase();
            const iLost = vs.state === "resolved" && vs.winner !== ZERO_ADDRESS && vs.winner.toLowerCase() !== address!.toLowerCase();
            const st = iWon ? "won" : iLost ? "lost" : vs.state;
            const stColor = {
              open: "text-pv-cyan bg-pv-cyan/8 border-pv-cyan/15",
              accepted: "text-pv-fuch bg-pv-fuch/8 border-pv-fuch/15",
              resolved: "text-pv-emerald bg-pv-emerald/8 border-pv-emerald/15",
              won: "text-pv-emerald bg-pv-emerald/10 border-pv-emerald/20",
              lost: "text-pv-danger bg-pv-danger/6 border-pv-danger/12",
              draw: "text-pv-muted bg-pv-muted/6 border-pv-muted/10",
              cancelled: "text-zinc-500 bg-zinc-500/4 border-zinc-500/8",
            }[st] || "";

            return (
              <Link key={vs.id} href={`/vs/${vs.id}`} className="block">
                <div className="card p-5 hover:border-white/10 transition-all cursor-pointer">
                  <div className="flex justify-between items-center mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] border ${stColor}`}>
                      {STATE_LABELS[st] || st}
                    </span>
                    <span className="font-mono text-[13px] font-bold text-pv-gold">
                      ${vs.stake_amount * (vs.opponent === ZERO_ADDRESS ? 1 : 2)}
                    </span>
                  </div>
                  <div className="font-display text-[17px] font-bold leading-snug mb-3">
                    {vs.question}
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-pv-surface2">
                    <div className="flex-1 px-3 py-2 bg-pv-cyan/[0.03]">
                      <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-cyan/50">Creador</div>
                      <div className="text-xs font-medium mt-0.5 truncate">{vs.creator_position}</div>
                    </div>
                    <div className="w-px bg-pv-surface2" />
                    <div className="flex-1 px-3 py-2 bg-pv-fuch/[0.03]">
                      <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-fuch/50">Rival</div>
                      <div className="text-xs font-medium mt-0.5 truncate">{vs.opponent_position}</div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
