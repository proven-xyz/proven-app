"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/lib/wallet";
import { createVS } from "@/lib/contract";
import { CATEGORIES, PREFILLS, getShareUrl } from "@/lib/constants";
import { toast } from "sonner";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { GlassCard, Button, Input } from "@/components/ui";
import Confetti from "@/components/Confetti";
import { ArrowLeft, Copy, Check, Clock } from "lucide-react";

const DEADLINE_PRESETS = [
  { label: "1h", seconds: 3600 },
  { label: "24h", seconds: 86400 },
  { label: "3 días", seconds: 259200 },
  { label: "1 sem", seconds: 604800 },
];

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected, connect } = useWallet();

  const [question, setQuestion] = useState("");
  const [creatorPos, setCreatorPos] = useState("");
  const [opponentPos, setOpponentPos] = useState("");
  const [url, setUrl] = useState("");
  const [deadlinePreset, setDeadlinePreset] = useState(7200);
  const [customDeadline, setCustomDeadline] = useState("");
  const [stake, setStake] = useState(5);
  const [category, setCategory] = useState("custom");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

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
      const dlTimestamp = customDeadline
        ? Math.floor(new Date(customDeadline).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + deadlinePreset;

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
      setCreated(1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
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

  if (created) {
    return (
      <>
        <Confetti active={showConfetti} />
        <PageTransition>
          <AnimatedItem>
            <div className="text-center pt-6">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="font-display text-5xl font-extrabold text-pv-emerald mb-4"
              >
                PROVEN.
              </motion.div>
              <h2 className="font-display text-2xl font-bold mb-2">
                VS creado y fondeado
              </h2>
              <p className="text-pv-muted mb-7">Mandá este link a tu rival.</p>

              <GlassCard className="mb-5">
                <div className="flex gap-2.5">
                  <input
                    readOnly
                    value={getShareUrl(created)}
                    className="input flex-1 font-mono text-xs"
                  />
                  <button
                    onClick={copyLink}
                    className="px-5 py-3 rounded-xl bg-pv-text text-pv-bg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity focus-ring"
                  >
                    {copied ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                    {copied ? "Listo" : "Copiar"}
                  </button>
                </div>
              </GlassCard>

              <div className="flex gap-3 justify-center mb-7">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Te desafío: ${getShareUrl(created)}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip text-pv-muted hover:text-pv-emerald transition-colors"
                >
                  WhatsApp
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(getShareUrl(created))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip text-pv-muted hover:text-pv-emerald transition-colors"
                >
                  Telegram
                </a>
              </div>

              <div className="flex gap-3 justify-center">
                <Link href={`/vs/${created}`}>
                  <Button
                    variant="primary"
                    fullWidth={false}
                    className="px-7"
                    size="sm"
                  >
                    Ver VS
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  fullWidth={false}
                  className="px-7"
                  size="sm"
                  onClick={() => {
                    setCreated(null);
                    setQuestion("");
                    setCreatorPos("");
                    setOpponentPos("");
                    setUrl("");
                  }}
                >
                  Crear otro
                </Button>
              </div>
            </div>
          </AnimatedItem>
        </PageTransition>
      </>
    );
  }

  return (
    <PageTransition>
      <AnimatedItem>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-pv-muted hover:text-pv-text mb-5 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver
        </Link>
      </AnimatedItem>

      {/* Question textarea */}
      <AnimatedItem>
        <textarea
          rows={3}
          className="w-full py-6 bg-transparent border-b-2 border-pv-surface2 text-pv-text placeholder:text-pv-muted
                     font-display font-bold text-[clamp(24px,6vw,36px)] leading-[1.05] tracking-tight resize-none outline-none mb-7
                     focus:border-pv-cyan/40 transition-colors"
          placeholder="¿Qué va a pasar?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </AnimatedItem>

      {/* Category chips */}
      <AnimatedItem>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {CATEGORIES.filter((c) => c.id !== "custom").map((c) => (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => prefill(c.id)}
              className="chip whitespace-nowrap text-[13px]"
              style={{
                borderColor: category === c.id ? c.color + "40" : undefined,
                backgroundColor: category === c.id ? c.color + "12" : undefined,
                color: category === c.id ? c.color : undefined,
              }}
            >
              {c.label}
            </motion.button>
          ))}
        </div>
      </AnimatedItem>

      <div className="flex flex-col gap-5">
        {/* Positions */}
        <AnimatedItem>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Yo apuesto"
              dot="#22D3EE"
              placeholder="Argentina gana"
              value={creatorPos}
              onChange={(e) => setCreatorPos(e.target.value)}
            />
            <Input
              label="Rival apuesta"
              dot="#E879F9"
              placeholder="Brasil gana"
              value={opponentPos}
              onChange={(e) => setOpponentPos(e.target.value)}
            />
          </div>
        </AnimatedItem>

        {/* Stake chips */}
        <AnimatedItem>
          <div>
            <label className="label">Subí la apuesta</label>
            <div className="grid grid-cols-4 gap-2.5">
              {[2, 5, 10, 25].map((v) => (
                <motion.button
                  key={v}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStake(v)}
                  className={`py-4 rounded-xl font-mono text-[17px] font-bold cursor-pointer transition-all border-2 focus-ring ${
                    stake === v
                      ? "border-pv-cyan bg-pv-cyan/10 text-pv-cyan shadow-glow"
                      : "border-pv-surface2 bg-pv-surface text-pv-muted hover:border-pv-border"
                  }`}
                >
                  ${v}
                </motion.button>
              ))}
            </div>
          </div>
        </AnimatedItem>

        <AnimatedItem>
          <Input
            label="Fuente de verificación"
            mono
            placeholder="espn.com, weather.com..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </AnimatedItem>

        {/* Deadline presets */}
        <AnimatedItem>
          <div>
            <label className="label flex items-center gap-1.5">
              <Clock size={12} />
              Deadline
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {DEADLINE_PRESETS.map((preset) => (
                <motion.button
                  key={preset.seconds}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setDeadlinePreset(preset.seconds);
                    setCustomDeadline("");
                  }}
                  className={`py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all border focus-ring ${
                    deadlinePreset === preset.seconds && !customDeadline
                      ? "border-pv-fuch/30 bg-pv-fuch/10 text-pv-fuch"
                      : "border-pv-surface2 bg-pv-surface text-pv-muted hover:border-pv-border"
                  }`}
                >
                  {preset.label}
                </motion.button>
              ))}
            </div>
            <input
              type="datetime-local"
              className="input text-sm focus-ring"
              value={customDeadline}
              onChange={(e) => setCustomDeadline(e.target.value)}
              placeholder="O elegí fecha exacta..."
            />
          </div>
        </AnimatedItem>

        {/* Submit */}
        <AnimatedItem>
          {isConnected ? (
            <Button
              variant="cyan"
              onClick={handleSubmit}
              loading={loading}
            >
              {loading ? "Fondeando..." : `Crear y Fondear $${stake}`}
            </Button>
          ) : (
            <Button onClick={connect}>Conectar Wallet</Button>
          )}
        </AnimatedItem>
      </div>
    </PageTransition>
  );
}
