"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { getVS, acceptVS, resolveVS, cancelVS } from "@/lib/contract";
import type { VSData } from "@/lib/contract";
import { ZERO_ADDRESS, shortenAddress, getShareUrl, STATE_LABELS } from "@/lib/constants";
import { useCountdown } from "@/lib/hooks";
import { toast } from "sonner";

export default function VSDetailPage() {
  const params = useParams();
  const vsId = Number(params.id);
  const { address, isConnected, connect } = useWallet();

  const [vs, setVS] = useState<VSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resolvePhase, setResolvePhase] = useState(-1);

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

  if (loading) return <div className="text-center py-20 text-pv-muted">Cargando...</div>;
  if (!vs) return (
    <div className="text-center py-20">
      <p className="font-display font-bold text-lg mb-4">VS no encontrado</p>
      <Link href="/" className="btn-primary w-auto inline-block px-8">Volver</Link>
    </div>
  );

  const isCreator = address?.toLowerCase() === vs.creator.toLowerCase();
  const isOpponent = address?.toLowerCase() === vs.opponent.toLowerCase();
  const canAccept = vs.state === "open" && isConnected && !isCreator;
  const canResolve = vs.state === "accepted" && countdown.expired;
  const canCancel = vs.state === "open" && isCreator;
  const hasWinner = vs.winner !== ZERO_ADDRESS;
  const iWon = hasWinner && address?.toLowerCase() === vs.winner.toLowerCase();

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

    // Animate phases while waiting for real resolution
    const t1 = setTimeout(() => setResolvePhase(1), 1500);
    const t2 = setTimeout(() => setResolvePhase(2), 3200);
    const t3 = setTimeout(() => setResolvePhase(3), 4800);

    try {
      await resolveVS(address, vsId);
      toast.success("PROVEN.");
      fetchVS();
    } catch (err: any) {
      toast.error(err.message || "Error al resolver");
    }
    clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
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
    <div>
      <Link href={isConnected ? "/dashboard" : "/"} className="text-sm text-pv-muted hover:text-pv-text mb-5 inline-block">
        ← Volver
      </Link>

      {/* ═══ WINNER REVEAL — The PROVEN stamp ═══ */}
      {vs.state === "resolved" && resolvePhase === -1 && (
        <div className="card p-10 text-center mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(34,211,238,0.06),transparent_60%),radial-gradient(ellipse_at_70%_50%,rgba(232,121,249,0.06),transparent_60%)] pointer-events-none" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald mb-5">
              PROVEN ya decidió
            </div>
            <div className="inline-block px-8 py-3 rounded-lg border-[3px] border-pv-emerald text-pv-emerald font-display text-3xl font-bold uppercase tracking-widest -rotate-12 shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-6">
              PROVEN.
            </div>
            <h2 className="font-display text-2xl font-bold mb-3">
              {hasWinner ? `Ganó @${shortenAddress(vs.winner)}` : "Empate"}
            </h2>
            {hasWinner && (
              <div className="font-mono text-3xl font-bold text-pv-gold mb-5 [text-shadow:0_0_20px_rgba(251,191,36,0.4)]">
                +${vs.stake_amount * 2}
              </div>
            )}
            {vs.resolution_summary && (
              <p className="text-sm text-pv-muted leading-relaxed">{vs.resolution_summary}</p>
            )}
          </div>
        </div>
      )}

      {/* ═══ RESOLVING STATE — Terminal ═══ */}
      {actionLoading === "resolve" && (
        <div className="card p-8 text-center mb-6">
          <div className="w-14 h-14 rounded-full border-[3px] border-transparent border-t-pv-emerald animate-spin mx-auto mb-5" />
          <div className="font-mono text-sm text-pv-emerald text-left leading-[2.2]">
            <div style={{ opacity: resolvePhase >= 0 ? 1 : 0.2 }}>&gt; IA buscando pruebas...</div>
            <div style={{ opacity: resolvePhase >= 1 ? 1 : 0.2 }}>&gt; Analizando {vs.resolution_url}...</div>
            <div style={{ opacity: resolvePhase >= 2 ? 1 : 0.2 }}>&gt; Comparando fuentes...</div>
            <div style={{ opacity: resolvePhase >= 3 ? 1 : 0.2 }}>&gt; Emitiendo veredicto_</div>
          </div>
        </div>
      )}

      {/* ═══ MAIN STATUS CARD ═══ */}
      {(vs.state !== "resolved" || resolvePhase !== -1) && actionLoading !== "resolve" && (
        <div className="card mb-5">
          <div className="absolute top-0 left-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_0%_40%,rgba(34,211,238,0.06),transparent_65%)] pointer-events-none" />
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_100%_40%,rgba(232,121,249,0.06),transparent_65%)] pointer-events-none" />

          <div className="relative p-6">
            <div className="flex justify-between items-center mb-5">
              {vs.state === "open" && !isCreator ? (
                <div className="text-sm font-bold text-pv-fuch">@{shortenAddress(vs.creator)} te desafía</div>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] bg-pv-cyan/10 text-pv-cyan border border-pv-cyan/20">
                  {STATE_LABELS[vs.state] || vs.state}
                </span>
              )}
              <span className="font-mono text-[11px] text-pv-muted">#{vs.id}</span>
            </div>

            <h1 className="font-display text-[clamp(26px,7vw,42px)] font-bold leading-[0.9] tracking-tight mb-7">
              {vs.question}
            </h1>

            {/* Split VS */}
            <div className="flex rounded-2xl overflow-hidden border-2 border-pv-surface2 mb-6">
              <div className="flex-1 p-4 bg-pv-cyan/[0.03]">
                <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-cyan/60">Creador</div>
                <div className="text-sm font-semibold mt-1">{shortenAddress(vs.creator)}</div>
                <div className="text-xs text-pv-cyan mt-1">{vs.creator_position}</div>
              </div>
              <div className="w-0.5 bg-pv-surface2" />
              <div className="flex-1 p-4 bg-pv-fuch/[0.03]">
                {vs.opponent === ZERO_ADDRESS ? (
                  <div className="text-center py-2 text-xs text-pv-muted italic">Esperando rival...</div>
                ) : (
                  <>
                    <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-fuch/60">Rival</div>
                    <div className="text-sm font-semibold mt-1">{shortenAddress(vs.opponent)}</div>
                    <div className="text-xs text-pv-fuch mt-1">{vs.opponent_position}</div>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-pv-surface2 rounded-2xl p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">Pozo</div>
                <div className="font-mono text-2xl font-bold text-pv-gold">
                  ${vs.stake_amount * (vs.opponent === ZERO_ADDRESS ? 1 : 2)}
                </div>
              </div>
              <div className="bg-pv-surface2 rounded-2xl p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">Deadline</div>
                <div className={`font-mono text-xl font-bold ${countdown.expired ? "text-pv-gold" : "text-pv-text"}`}>
                  {countdown.text}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-pv-surface2 px-6 py-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-pv-emerald shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="text-xs text-pv-muted">PROVEN verifica automáticamente</span>
          </div>
        </div>
      )}

      {/* ═══ ACTIONS ═══ */}
      <div className="flex flex-col gap-3">
        {canAccept && (
          <button onClick={handleAccept} disabled={!!actionLoading} className="btn-fuch flex items-center justify-center gap-2">
            {actionLoading === "accept" ? "Aceptando..." : `Aceptar y Poner $${vs.stake_amount}`}
          </button>
        )}

        {vs.state === "open" && !isConnected && (
          <button onClick={connect} className="btn-primary">Conectar Wallet para aceptar</button>
        )}

        {canResolve && actionLoading !== "resolve" && (
          <button onClick={handleResolve} className="btn-emerald">Resolver VS</button>
        )}

        {vs.state === "accepted" && !countdown.expired && actionLoading !== "resolve" && (
          <div className="card p-5 text-center">
            <p className="text-sm text-pv-muted">Esperando deadline...</p>
          </div>
        )}

        {vs.state === "open" && isCreator && (
          <div className="card p-5">
            <div className="text-sm font-semibold mb-3">Mandá este link:</div>
            <div className="flex gap-2.5">
              <input readOnly value={getShareUrl(vsId)} className="input flex-1 font-mono text-[11px]" />
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(getShareUrl(vsId));
                  setCopied(true);
                  toast.success("Link copiado");
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-3 rounded-xl bg-pv-text text-pv-bg font-bold text-sm"
              >
                {copied ? "Listo" : "Copiar"}
              </button>
            </div>
          </div>
        )}

        {canCancel && (
          <button onClick={handleCancel} disabled={!!actionLoading} className="btn-danger">
            {actionLoading === "cancel" ? "Cancelando..." : "Cancelar VS"}
          </button>
        )}
      </div>
    </div>
  );
}
