"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { createVS } from "@/lib/contract";
import { CATEGORIES, PREFILLS, getShareUrl } from "@/lib/constants";
import { toast } from "sonner";

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected, connect } = useWallet();

  const [question, setQuestion] = useState("");
  const [creatorPos, setCreatorPos] = useState("");
  const [opponentPos, setOpponentPos] = useState("");
  const [url, setUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [stake, setStake] = useState(5);
  const [category, setCategory] = useState("custom");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  function prefill(catId: string) {
    setCategory(catId);
    const p = PREFILLS[catId];
    if (p) {
      setQuestion(p.q);
      setCreatorPos(p.a);
      setOpponentPos(p.b);
      setUrl(p.u);
    }
  }

  async function handleSubmit() {
    if (!question || !creatorPos || !opponentPos) {
      toast.error("Completá todos los campos");
      return;
    }
    if (!isConnected || !address) {
      toast.error("Conectá tu wallet primero");
      return;
    }

    setLoading(true);
    try {
      const dlTimestamp = deadline
        ? Math.floor(new Date(deadline).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 7200;

      const result = await createVS(address, {
        question,
        creator_position: creatorPos,
        opponent_position: opponentPos,
        resolution_url: url || "https://google.com",
        deadline: dlTimestamp,
        stake_amount: stake,
        category,
      });

      toast.success("VS creado y fondeado");
      // TODO: extract VS id from receipt
      setCreated(1);
    } catch (err: any) {
      toast.error(err.message || "Error al crear el VS");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!created) return;
    await navigator.clipboard.writeText(getShareUrl(created));
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Success screen ──
  if (created) {
    return (
      <div className="text-center pt-6">
        <div className="font-display text-5xl font-bold text-pv-emerald mb-4">PROVEN.</div>
        <h2 className="font-display text-2xl font-bold mb-2">VS creado y fondeado</h2>
        <p className="text-pv-muted mb-7">Mandá este link a tu rival.</p>
        <div className="card p-5 mb-5">
          <div className="flex gap-2.5">
            <input readOnly value={getShareUrl(created)} className="input flex-1 font-mono text-xs" />
            <button onClick={copyLink} className="px-5 py-3 rounded-xl bg-pv-text text-pv-bg font-bold text-sm">
              {copied ? "Listo" : "Copiar"}
            </button>
          </div>
        </div>
        <div className="flex gap-3 justify-center mb-7">
          <a href={`https://wa.me/?text=${encodeURIComponent(`Te desafío: ${getShareUrl(created)}`)}`} target="_blank" className="chip text-pv-muted">WhatsApp</a>
          <a href={`https://t.me/share/url?url=${encodeURIComponent(getShareUrl(created))}`} target="_blank" className="chip text-pv-muted">Telegram</a>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href={`/vs/${created}`} className="btn-primary w-auto px-7 text-center text-sm">Ver VS</Link>
          <button onClick={() => { setCreated(null); setQuestion(""); setCreatorPos(""); setOpponentPos(""); setUrl(""); }} className="btn-ghost w-auto px-7 text-sm">
            Crear otro
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div>
      <Link href="/" className="text-sm text-pv-muted hover:text-pv-text mb-5 inline-block">← Volver</Link>

      {/* The massive question input */}
      <textarea
        rows={3}
        className="w-full py-6 bg-transparent border-b-2 border-pv-surface2 text-pv-text placeholder:text-pv-muted
                   font-display font-bold text-[clamp(24px,6vw,36px)] leading-[1.05] tracking-tight resize-none outline-none mb-7"
        placeholder="¿Qué va a pasar?"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
        {CATEGORIES.filter(c => c.id !== "custom").map((c) => (
          <button
            key={c.id}
            onClick={() => prefill(c.id)}
            className="chip whitespace-nowrap text-[13px]"
            style={{
              borderColor: category === c.id ? c.color + "40" : undefined,
              backgroundColor: category === c.id ? c.color + "12" : undefined,
              color: category === c.id ? c.color : undefined,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        {/* Positions */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              <span className="inline-block w-2 h-2 rounded-full bg-pv-cyan mr-2 align-middle" />
              Yo apuesto
            </label>
            <input className="input" placeholder="Argentina gana" value={creatorPos} onChange={(e) => setCreatorPos(e.target.value)} />
          </div>
          <div>
            <label className="label">
              <span className="inline-block w-2 h-2 rounded-full bg-pv-fuch mr-2 align-middle" />
              Rival apuesta
            </label>
            <input className="input" placeholder="Brasil gana" value={opponentPos} onChange={(e) => setOpponentPos(e.target.value)} />
          </div>
        </div>

        {/* Stake chips */}
        <div>
          <label className="label">Subí la apuesta</label>
          <div className="grid grid-cols-4 gap-2.5">
            {[2, 5, 10, 25].map((v) => (
              <button
                key={v}
                onClick={() => setStake(v)}
                className={`py-4 rounded-xl font-mono text-[17px] font-bold cursor-pointer transition-all border-2
                  ${stake === v
                    ? "border-pv-cyan bg-pv-cyan/10 text-pv-cyan shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                    : "border-pv-surface2 bg-pv-surface text-pv-muted"
                  }`}
              >
                ${v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Fuente de verificación</label>
          <input className="input font-mono text-xs" placeholder="espn.com, weather.com..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>

        <div>
          <label className="label">Deadline</label>
          <input type="datetime-local" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>

        {isConnected ? (
          <button onClick={handleSubmit} disabled={loading} className="btn-cyan flex items-center justify-center gap-2.5">
            {loading ? "Fondeando..." : `Crear y Fondear $${stake}`}
          </button>
        ) : (
          <button onClick={connect} className="btn-primary">Conectar Wallet</button>
        )}
      </div>
    </div>
  );
}
