"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useWallet } from "@/lib/wallet";
import { getVS, acceptVS, resolveVS, cancelVS } from "@/lib/contract";
import type { VSData } from "@/lib/contract";
import {
  ZERO_ADDRESS,
  shortenAddress,
  getShareUrl,
  STATE_LABELS,
} from "@/lib/constants";
import { useCountdown } from "@/lib/hooks";
import { toast } from "sonner";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import {
  GlassCard,
  Badge,
  Button,
  Avatar,
  CountdownTimer,
} from "@/components/ui";
import ProvenStamp from "@/components/ProvenStamp";
import ResolutionTerminal from "@/components/ResolutionTerminal";
import Confetti from "@/components/Confetti";
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Share2,
} from "lucide-react";

const PROGRESS_STEPS = ["Creado", "Aceptado", "Verificando", "PROVEN"];

function ProgressBar({ state }: { state: string }) {
  const stepIndex =
    state === "open"
      ? 0
      : state === "accepted"
      ? 1
      : state === "resolved"
      ? 3
      : state === "cancelled"
      ? -1
      : 0;

  if (stepIndex === -1) return null;

  return (
    <div className="flex items-center gap-1 mb-6">
      {PROGRESS_STEPS.map((step, i) => {
        const isActive = i <= stepIndex;
        const isCurrent = i === stepIndex;
        return (
          <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full h-1 rounded-full overflow-hidden bg-pv-surface2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: isActive ? "100%" : "0%" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="h-full rounded-full bg-pv-emerald"
              />
            </div>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider ${
                isCurrent
                  ? "text-pv-emerald"
                  : isActive
                  ? "text-pv-text/60"
                  : "text-pv-muted/40"
              }`}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function VSDetailPage() {
  const params = useParams();
  const vsId = Number(params.id);
  const { address, isConnected, connect } = useWallet();

  const [vs, setVS] = useState<VSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resolvePhase, setResolvePhase] = useState(-1);
  const [showConfetti, setShowConfetti] = useState(false);

  const countdown = useCountdown(vs?.deadline || 0);

  const fetchVS = useCallback(async () => {
    const data = await getVS(vsId);
    setVS(data);
    setLoading(false);
  }, [vsId]);

  useEffect(() => {
    fetchVS();
    const i = setInterval(fetchVS, 10000);
    return () => clearInterval(i);
  }, [fetchVS]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-10 h-10 border-2 border-transparent border-t-pv-emerald rounded-full animate-spin mx-auto mb-4" />
        <p className="text-pv-muted text-sm">Cargando...</p>
      </div>
    );
  }

  if (!vs) {
    return (
      <div className="text-center py-20">
        <p className="font-display font-bold text-lg mb-4">VS no encontrado</p>
        <Link href="/">
          <Button variant="primary" fullWidth={false} className="px-8">
            Volver
          </Button>
        </Link>
      </div>
    );
  }

  const isCreator = address?.toLowerCase() === vs.creator.toLowerCase();
  const isOpponent = address?.toLowerCase() === vs.opponent.toLowerCase();
  const canAccept = vs.state === "open" && isConnected && !isCreator;
  const canResolve = vs.state === "accepted" && countdown.expired;
  const canCancel = vs.state === "open" && isCreator;
  const hasWinner = vs.winner !== ZERO_ADDRESS;
  const isOpen = vs.opponent === ZERO_ADDRESS;
  const pool = vs.stake_amount * (isOpen ? 1 : 2);

  async function handleAccept() {
    if (!address) return;
    setActionLoading("accept");
    try {
      await acceptVS(address, vsId, vs!.stake_amount);
      toast.success(`Aceptaste — hay $${vs!.stake_amount * 2} en juego`);
      fetchVS();
    } catch (err: any) {
      toast.error(err.message || "Error al aceptar");
    }
    setActionLoading(null);
  }

  async function handleResolve() {
    if (!address) return;
    setActionLoading("resolve");
    setResolvePhase(0);

    const t1 = setTimeout(() => setResolvePhase(1), 1500);
    const t2 = setTimeout(() => setResolvePhase(2), 3200);
    const t3 = setTimeout(() => setResolvePhase(3), 4800);

    try {
      await resolveVS(address, vsId);
      toast.success("PROVEN.");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      fetchVS();
    } catch (err: any) {
      toast.error(err.message || "Error al resolver");
    }
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);
    setResolvePhase(-1);
    setActionLoading(null);
  }

  async function handleCancel() {
    if (!address) return;
    setActionLoading("cancel");
    try {
      await cancelVS(address, vsId);
      toast.success("VS cancelado");
      fetchVS();
    } catch (err: any) {
      toast.error(err.message || "Error al cancelar");
    }
    setActionLoading(null);
  }

  return (
    <>
      <Confetti active={showConfetti} />
      <PageTransition>
        <AnimatedItem>
          <Link
            href={isConnected ? "/dashboard" : "/"}
            className="inline-flex items-center gap-1.5 text-sm text-pv-muted hover:text-pv-text mb-5 transition-colors"
          >
            <ArrowLeft size={14} />
            Volver
          </Link>
        </AnimatedItem>

        {/* Progress bar */}
        {vs.state !== "cancelled" && (
          <AnimatedItem>
            <ProgressBar state={vs.state} />
          </AnimatedItem>
        )}

        {/* WINNER REVEAL */}
        {vs.state === "resolved" && resolvePhase === -1 && (
          <AnimatedItem>
            <ProvenStamp
              winner={vs.winner}
              hasWinner={hasWinner}
              stakeAmount={vs.stake_amount}
              resolutionSummary={vs.resolution_summary}
            />
          </AnimatedItem>
        )}

        {/* RESOLVING TERMINAL */}
        {actionLoading === "resolve" && (
          <AnimatedItem>
            <ResolutionTerminal
              phase={resolvePhase}
              url={vs.resolution_url}
            />
          </AnimatedItem>
        )}

        {/* MAIN STATUS CARD */}
        {(vs.state !== "resolved" || resolvePhase !== -1) &&
          actionLoading !== "resolve" && (
            <AnimatedItem>
              <GlassCard glow="both" noPad className="mb-5">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-5">
                    {vs.state === "open" && !isCreator ? (
                      <div className="text-sm font-bold text-pv-fuch">
                        @{shortenAddress(vs.creator)} te desafía
                      </div>
                    ) : (
                      <Badge status={vs.state} large />
                    )}
                    <span className="font-mono text-[11px] text-pv-muted">
                      #{vs.id}
                    </span>
                  </div>

                  <h1 className="font-display text-[clamp(26px,7vw,42px)] font-bold leading-[0.9] tracking-tight mb-7">
                    {vs.question}
                  </h1>

                  {/* VS Split */}
                  <div className="flex rounded-2xl overflow-hidden border-2 border-pv-surface2 mb-6">
                    <div className="flex-1 p-4 bg-pv-cyan/[0.03]">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar side="creator" size={28} />
                        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-cyan/60">
                          Creador
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        {shortenAddress(vs.creator)}
                        {isCreator && (
                          <span className="text-pv-emerald text-[10px] ml-1">
                            (vos)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-pv-cyan mt-1">
                        {vs.creator_position}
                      </div>
                    </div>

                    <div className="w-px bg-pv-surface2 flex items-center justify-center relative">
                      <span className="absolute bg-pv-surface2 text-pv-muted text-[10px] font-bold px-1 py-0.5 rounded">
                        VS
                      </span>
                    </div>

                    <div className="flex-1 p-4 bg-pv-fuch/[0.03]">
                      {isOpen ? (
                        <div className="text-center py-2">
                          <div className="w-7 h-7 rounded-full border-2 border-dashed border-pv-border flex items-center justify-center mx-auto mb-2 text-pv-muted font-bold text-xs">
                            ?
                          </div>
                          <div className="text-xs text-pv-muted italic">
                            Esperando rival...
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar side="opponent" size={28} />
                            <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-fuch/60">
                              Rival
                            </div>
                          </div>
                          <div className="text-sm font-semibold">
                            {shortenAddress(vs.opponent)}
                            {isOpponent && (
                              <span className="text-pv-emerald text-[10px] ml-1">
                                (vos)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-pv-fuch mt-1">
                            {vs.opponent_position}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-pv-surface2 rounded-2xl p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                        Pozo
                      </div>
                      <div className="font-mono text-2xl font-bold text-pv-gold">
                        ${pool}
                      </div>
                    </div>
                    <div className="bg-pv-surface2 rounded-2xl p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                        Deadline
                      </div>
                      <CountdownTimer
                        deadline={vs.deadline}
                        className="text-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-pv-surface2 px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-pv-emerald shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    <span className="text-xs text-pv-muted">
                      PROVEN verifica automáticamente
                    </span>
                  </div>
                  {vs.resolution_url && (
                    <a
                      href={
                        vs.resolution_url.startsWith("http")
                          ? vs.resolution_url
                          : `https://${vs.resolution_url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-pv-muted hover:text-pv-cyan transition-colors flex items-center gap-1"
                    >
                      <ExternalLink size={10} />
                      Fuente
                    </a>
                  )}
                </div>
              </GlassCard>
            </AnimatedItem>
          )}

        {/* ACTIONS */}
        <AnimatedItem>
          <div className="flex flex-col gap-3">
            {canAccept && (
              <Button
                variant="fuch"
                onClick={handleAccept}
                loading={actionLoading === "accept"}
              >
                {actionLoading === "accept"
                  ? "Aceptando..."
                  : `Aceptar y Poner $${vs.stake_amount}`}
              </Button>
            )}

            {vs.state === "open" && !isConnected && (
              <Button onClick={connect}>
                Conectar Wallet para aceptar
              </Button>
            )}

            {canResolve && actionLoading !== "resolve" && (
              <Button variant="emerald" onClick={handleResolve}>
                Resolver VS
              </Button>
            )}

            {vs.state === "accepted" &&
              !countdown.expired &&
              actionLoading !== "resolve" && (
                <GlassCard className="text-center">
                  <p className="text-sm text-pv-muted">
                    Esperando deadline para resolver...
                  </p>
                </GlassCard>
              )}

            {vs.state === "open" && isCreator && (
              <GlassCard>
                <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Share2 size={14} className="text-pv-cyan" />
                  Mandá este link a tu rival
                </div>
                <div className="flex gap-2.5">
                  <input
                    readOnly
                    value={getShareUrl(vsId)}
                    className="input flex-1 font-mono text-[11px]"
                  />
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(getShareUrl(vsId));
                      setCopied(true);
                      toast.success("Link copiado");
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-4 py-3 rounded-xl bg-pv-text text-pv-bg font-bold text-sm flex items-center gap-1.5 hover:opacity-90 transition-opacity focus-ring"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Listo" : "Copiar"}
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Te desafío: ${getShareUrl(vsId)}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl border border-pv-border text-center text-xs font-semibold text-pv-muted hover:text-pv-text transition-colors"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(getShareUrl(vsId))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl border border-pv-border text-center text-xs font-semibold text-pv-muted hover:text-pv-text transition-colors"
                  >
                    Telegram
                  </a>
                </div>
              </GlassCard>
            )}

            {canCancel && (
              <Button
                variant="danger"
                onClick={handleCancel}
                loading={actionLoading === "cancel"}
              >
                {actionLoading === "cancel"
                  ? "Cancelando..."
                  : "Cancelar VS"}
              </Button>
            )}
          </div>
        </AnimatedItem>
      </PageTransition>
    </>
  );
}
