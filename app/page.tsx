"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@/lib/wallet";
import { getVS, getVSCount } from "@/lib/contract";
import type { VSData } from "@/lib/contract";
import { ZERO_ADDRESS, shortenAddress } from "@/lib/constants";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { GlassCard, PoolBadge, Button, VSCardSkeleton } from "@/components/ui";
import VSCard from "@/components/VSCard";
import { Zap, Send, UserCheck, Shield } from "lucide-react";

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
    <PageTransition>
      {/* Hero */}
      <AnimatedItem>
        {featuredVS ? (
          <GlassCard glow="both" className="mb-6">
            <div className="p-2 text-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald mb-6">
                VS del día
              </div>

              <motion.h1
                className="font-display text-[clamp(30px,8vw,48px)] font-bold leading-[0.92] tracking-tight mb-7"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                {featuredVS.question}
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <PoolBadge
                  amount={
                    featuredVS.stake_amount *
                    (featuredVS.opponent === ZERO_ADDRESS ? 1 : 2)
                  }
                  large
                />
              </motion.div>
            </div>
          </GlassCard>
        ) : (
          !loading && (
            <GlassCard glow="emerald" className="mb-6">
              <div className="p-6 text-center">
                <div className="font-display text-4xl font-extrabold text-pv-emerald mb-3">
                  PROVEN.
                </div>
                <p className="text-pv-muted text-sm">
                  La verdad se demuestra. Creá el primer VS.
                </p>
              </div>
            </GlassCard>
          )
        )}
      </AnimatedItem>

      {/* CTAs */}
      <AnimatedItem>
        <div className="flex flex-col gap-3 mb-12">
          {isConnected ? (
            <Link href="/vs/create" className="block">
              <Button variant="primary">Desafiar a alguien</Button>
            </Link>
          ) : (
            <Button onClick={connect}>Conectar Wallet para empezar</Button>
          )}
          <Link href="/explore" className="block">
            <Button variant="ghost">Explorar VS abiertos</Button>
          </Link>
        </div>
      </AnimatedItem>

      {/* Differentiator */}
      <AnimatedItem>
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
            La IA busca las pruebas.{" "}
            <span className="text-pv-emerald font-semibold">PROVEN</span> decide.
            El ganador cobra al instante.
          </p>
        </div>
      </AnimatedItem>

      {/* How it works */}
      <AnimatedItem>
        <div className="mb-12">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-muted text-center mb-5">
            ¿Cómo funciona?
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {[
              {
                icon: Zap,
                label: "Desafiá",
                sub: "tu apuesta",
                color: "text-pv-cyan",
                bg: "bg-pv-cyan/10",
                border: "border-pv-cyan/20",
              },
              {
                icon: Send,
                label: "Mandá",
                sub: "el link",
                color: "text-pv-fuch",
                bg: "bg-pv-fuch/10",
                border: "border-pv-fuch/20",
              },
              {
                icon: UserCheck,
                label: "Acepta",
                sub: "tu rival",
                color: "text-pv-gold",
                bg: "bg-pv-gold/10",
                border: "border-pv-gold/20",
              },
              {
                icon: Shield,
                label: "PROVEN",
                sub: "decide",
                color: "text-pv-emerald",
                bg: "bg-pv-emerald/10",
                border: "border-pv-emerald/20",
              },
            ].map(({ icon: Icon, label, sub, color, bg, border }) => (
              <motion.div
                key={label}
                whileHover={{ y: -3 }}
                className="card p-4 text-center"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center mx-auto mb-2.5`}
                >
                  <Icon size={16} className={color} />
                </div>
                <div className={`font-display text-[13px] font-bold ${color}`}>
                  {label}
                </div>
                <div className="text-[11px] text-pv-muted mt-0.5">{sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedItem>

      {/* Global stats */}
      {!loading && allVS.length > 0 && (
        <AnimatedItem>
          <div className="grid grid-cols-3 gap-2.5 mb-12">
            <div className="card p-4 text-center">
              <div className="font-mono text-xl font-bold text-pv-text">
                {allVS.length}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-pv-muted mt-1">
                VS totales
              </div>
            </div>
            <div className="card p-4 text-center">
              <div className="font-mono text-xl font-bold text-pv-emerald">
                {resolvedVS.length}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-pv-muted mt-1">
                Resueltos
              </div>
            </div>
            <div className="card p-4 text-center">
              <div className="font-mono text-xl font-bold text-pv-gold">
                $
                {allVS.reduce(
                  (sum, v) =>
                    sum +
                    v.stake_amount * (v.opponent === ZERO_ADDRESS ? 1 : 2),
                  0
                )}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-pv-muted mt-1">
                Pozo total
              </div>
            </div>
          </div>
        </AnimatedItem>
      )}

      {/* Open VS preview */}
      {openVS.length > 0 && (
        <AnimatedItem>
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pv-cyan shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-cyan">
                  VS Abiertos
                </span>
              </div>
              <span className="text-[11px] text-pv-muted">
                {openVS.length} esperando rival
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {openVS.slice(0, 2).map((vs) => (
                <VSCard key={vs.id} vs={vs} showAcceptCTA />
              ))}
            </div>

            {openVS.length > 2 && (
              <Link
                href="/explore"
                className="block w-full py-3.5 rounded-xl border border-pv-cyan/15 bg-pv-cyan/[0.04] text-center font-display text-sm font-bold text-pv-cyan mt-2.5 hover:bg-pv-cyan/[0.08] transition-colors"
              >
                Ver todos los VS abiertos ({openVS.length})
              </Link>
            )}
          </div>
        </AnimatedItem>
      )}

      {/* Recently proven */}
      {resolvedVS.length > 0 && (
        <AnimatedItem>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald text-center mb-4">
              Recientemente proven
            </div>
            <div className="flex flex-col gap-2">
              {resolvedVS.slice(0, 3).map((vs) => (
                <Link key={vs.id} href={`/vs/${vs.id}`} className="block group">
                  <motion.div
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-pv-surface border border-pv-surface2 group-hover:border-pv-emerald/20 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-pv-emerald/10 border border-pv-emerald/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-pv-emerald" />
                      </div>
                      <span className="text-[13px]">
                        <span className="font-semibold">
                          {shortenAddress(vs.winner)}
                        </span>
                        <span className="text-pv-muted"> ganó</span>
                      </span>
                    </div>
                    <span className="font-mono text-[13px] font-bold text-pv-gold">
                      +${vs.stake_amount * 2}
                    </span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </AnimatedItem>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-3">
          <VSCardSkeleton />
          <VSCardSkeleton />
        </div>
      )}
    </PageTransition>
  );
}
