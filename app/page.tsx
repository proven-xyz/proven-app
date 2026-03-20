"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { getVS, getVSCount } from "@/lib/contract";
import type { VSData } from "@/lib/contract";
import { ZERO_ADDRESS, shortenAddress, getCategoryInfo } from "@/lib/constants";
import { useCountdown } from "@/lib/hooks";

export default function HomePage() {
  const { isConnected, connect } = useWallet();
  const [allVS, setAllVS] = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const count = await getVSCount();
        const promises = Array.from({ length: count }, (_, i) => getVS(i + 1));
        const results = await Promise.all(promises);
        setAllVS(results.filter((v): v is VSData => v !== null));
      } catch (e) {
        console.error("Failed to load VS:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const openVS = allVS.filter((v) => v.state === "open");
  const resolvedVS = allVS.filter((v) => v.state === "resolved");
  const featuredVS = allVS[0];

  return (
    <div>
      {/* Hero */}
      {featuredVS && (
        <div className="card mb-6">
          {/* Side glows */}
          <div className="absolute top-0 left-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_0%_40%,rgba(34,211,238,0.07),transparent_65%)] pointer-events-none" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_100%_40%,rgba(232,121,249,0.07),transparent_65%)] pointer-events-none" />

          <div className="relative p-8 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald mb-6">
              VS del día
            </div>
            <h1 className="font-display text-[clamp(30px,8vw,48px)] font-bold leading-[0.92] tracking-tight mb-7">
              {featuredVS.question}
            </h1>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.12)] font-mono text-lg font-bold text-pv-gold">
              Hay ${featuredVS.stake_amount * (featuredVS.opponent === ZERO_ADDRESS ? 1 : 2)} en juego
            </div>
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-3 mb-12">
        {isConnected ? (
          <Link href="/vs/create" className="btn-primary text-center">
            Desafiar a alguien
          </Link>
        ) : (
          <button onClick={connect} className="btn-primary">Conectar Wallet para empezar</button>
        )}
        <Link href="/explore" className="btn-ghost text-center">
          Explorar VS abiertos
        </Link>
      </div>

      {/* Differentiator */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="h-px w-10 bg-pv-surface2" />
          <div className="w-1.5 h-1.5 rounded-full bg-pv-emerald shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
          <div className="h-px w-10 bg-pv-surface2" />
        </div>
        <p className="text-[15px] text-pv-muted max-w-[380px] mx-auto leading-relaxed">
          <span className="text-pv-text font-semibold">Sin árbitros.</span>{" "}
          <span className="text-pv-text font-semibold">Sin discusiones.</span>{" "}
          <span className="text-pv-text font-semibold">Sin esperar.</span>
          <br />
          La IA busca las pruebas. <span className="text-pv-emerald font-semibold">PROVEN</span> decide. El ganador cobra al instante.
        </p>
      </div>

      {/* How it works */}
      <div className="mb-12">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-muted text-center mb-5">
          ¿Cómo funciona?
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { l: "Desafiá", s: "tu apuesta", c: "text-pv-cyan" },
            { l: "Mandá", s: "el link", c: "text-pv-fuch" },
            { l: "Acepta", s: "tu rival", c: "text-pv-gold" },
            { l: "PROVEN", s: "decide", c: "text-pv-emerald" },
          ].map(({ l, s, c }) => (
            <div key={l} className="card p-5 text-center">
              <div className={`font-display text-[13px] font-bold ${c}`}>{l}</div>
              <div className="text-[11px] text-pv-muted mt-1">{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Open VS preview */}
      {openVS.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-pv-cyan shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-cyan">
                VS Abiertos
              </span>
            </div>
            <span className="text-[11px] text-pv-muted">{openVS.length} esperando rival</span>
          </div>

          {openVS.slice(0, 2).map((vs) => (
            <Link key={vs.id} href={`/vs/${vs.id}`} className="block">
              <div className="card p-5 mb-2.5 hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold">{shortenAddress(vs.creator)}</span>
                    <span className="text-[12px] text-pv-muted">desafía</span>
                  </div>
                  <span className="font-mono text-[13px] font-bold text-pv-gold">${vs.stake_amount * 2}</span>
                </div>
                <div className="font-display text-lg font-bold leading-snug mb-3">{vs.question}</div>
                <div className="w-full py-3 rounded-xl bg-pv-fuch/10 border border-pv-fuch/20 text-center font-display text-sm font-bold text-pv-fuch">
                  Aceptar y Poner ${vs.stake_amount}
                </div>
              </div>
            </Link>
          ))}

          {openVS.length > 2 && (
            <Link
              href="/explore"
              className="block w-full py-3.5 rounded-xl border border-pv-cyan/15 bg-pv-cyan/[0.04] text-center font-display text-sm font-bold text-pv-cyan mt-1"
            >
              Ver todos los VS abiertos ({openVS.length})
            </Link>
          )}
        </div>
      )}

      {/* Recently proven */}
      {resolvedVS.length > 0 && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald text-center mb-4">
            Recientemente proven
          </div>
          {resolvedVS.slice(0, 3).map((vs) => (
            <Link key={vs.id} href={`/vs/${vs.id}`} className="block">
              <div className="flex items-center justify-between p-3 rounded-xl bg-pv-surface border border-pv-surface2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-pv-emerald/10 border border-pv-emerald/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-pv-emerald" />
                  </div>
                  <span className="text-[13px]">
                    <span className="font-semibold">{shortenAddress(vs.winner)}</span>
                    <span className="text-pv-muted"> ganó</span>
                  </span>
                </div>
                <span className="font-mono text-[13px] font-bold text-pv-gold">+${vs.stake_amount * 2}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Loading / empty */}
      {loading && (
        <div className="text-center py-20 text-pv-muted text-sm">Cargando...</div>
      )}
    </div>
  );
}
