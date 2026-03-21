"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import { createVS } from "@/lib/contract";
import { CATEGORIES, PREFILLS, getShareUrl } from "@/lib/constants";
import { toast } from "sonner";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { GlassCard, Button, Input } from "@/components/ui";
import Confetti from "@/components/Confetti";
import { ArrowLeft, Copy, Check, Clock } from "lucide-react";

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected, connect } = useWallet();
  const t    = useTranslations("create");
  const tc   = useTranslations("common");
  const tCat = useTranslations("categories");

  const DEADLINE_PRESETS = [
    { label: t("presets.1h"),     seconds: 3600 },
    { label: t("presets.24h"),    seconds: 86400 },
    { label: t("presets.3days"),  seconds: 259200 },
    { label: t("presets.1week"),  seconds: 604800 },
  ];

  const [question, setQuestion]             = useState("");
  const [creatorPos, setCreatorPos]         = useState("");
  const [opponentPos, setOpponentPos]       = useState("");
  const [url, setUrl]                       = useState("");
  const [deadlinePreset, setDeadlinePreset] = useState(7200);
  const [customDeadline, setCustomDeadline] = useState("");
  const [stake, setStake]                   = useState(5);
  const [category, setCategory]             = useState("custom");
  const [loading, setLoading]               = useState(false);
  const [created, setCreated]               = useState<number | null>(null);
  const [copied, setCopied]                 = useState(false);
  const [showConfetti, setShowConfetti]     = useState(false);

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
      toast.error(t("fillAllFields"));
      return;
    }
    if (!isConnected || !address) {
      toast.error(t("connectWalletFirst"));
      return;
    }

    setLoading(true);
    try {
      const dlTimestamp = customDeadline
        ? Math.floor(new Date(customDeadline).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + deadlinePreset;

      const result = await createVS(address, {
        question,
        creator_position:  creatorPos,
        opponent_position: opponentPos,
        resolution_url:    url || "https://google.com",
        deadline:          dlTimestamp,
        stake_amount:      stake,
        category,
      });

      toast.success(t("vsCreatedAndFunded"));
      setCreated(1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    } catch (err: any) {
      toast.error(err.message || t("errorCreating"));
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!created) return;
    await navigator.clipboard.writeText(getShareUrl(created));
    setCopied(true);
    toast.success(t("linkCopied"));
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
                className="font-display text-5xl font-extrabold text-pv-emerald mb-4 tracking-tight"
              >
                PROVEN.
              </motion.div>
              <h2 className="font-display text-2xl font-bold mb-2 tracking-tight">
                {t("vsCreatedAndFunded")}
              </h2>
              <p className="text-pv-muted mb-7">{t("sendThisLink")}</p>

              <GlassCard className="mb-5">
                <div className="flex gap-2.5">
                  <input
                    readOnly
                    value={getShareUrl(created)}
                    className="input flex-1 font-mono text-xs"
                  />
                  <button
                    onClick={copyLink}
                    className="px-5 py-3 rounded bg-pv-emerald text-pv-bg font-bold text-sm flex items-center gap-2 hover:brightness-110 transition-all focus-ring"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? tc("copied") : tc("copy")}
                  </button>
                </div>
              </GlassCard>

              <div className="flex gap-3 justify-center mb-7">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Te desafío: ${getShareUrl(created)}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip text-pv-muted hover:text-pv-emerald hover:border-pv-emerald/[0.3] transition-colors"
                >
                  WhatsApp
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(getShareUrl(created))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip text-pv-muted hover:text-pv-emerald hover:border-pv-emerald/[0.3] transition-colors"
                >
                  Telegram
                </a>
              </div>

              <div className="flex gap-3 justify-center">
                <Link href={`/vs/${created}`}>
                  <Button variant="primary" fullWidth={false} className="px-7" size="sm">
                    {t("viewVS")}
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
                  {t("createAnother")}
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
          className="inline-flex items-center gap-1.5 text-sm text-pv-muted hover:text-pv-text mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          {tc("back")}
        </Link>
        <div className="mb-6 lg:max-w-[720px] lg:mx-auto">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald/80 mb-2">
            {t("eyebrow")}
          </div>
          <h1 className="font-display text-[clamp(1.5rem,5vw,2.25rem)] font-bold tracking-tight leading-none text-pv-text">
            {t("pageTitle")}
          </h1>
          <p className="font-mono text-sm text-pv-muted mt-2 tracking-wide">
            {t("pageSubtitle")}
          </p>
        </div>
      </AnimatedItem>

      {/* Question textarea */}
      <AnimatedItem>
        <textarea
          rows={3}
          className="w-full lg:max-w-[720px] lg:mx-auto block pt-4 pb-0 bg-transparent border-b-2 border-white/[0.1] text-pv-text placeholder:text-pv-muted
                     font-display font-bold text-[clamp(24px,4vw,36px)] leading-[1.05] tracking-tight resize-none outline-none mb-7
                     focus:border-pv-emerald/50 transition-colors"
          placeholder={t("whatWillHappen")}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </AnimatedItem>

      {/* Category chips */}
      <AnimatedItem>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none lg:max-w-[720px] lg:mx-auto">
          {CATEGORIES.filter((c) => c.id !== "custom").map((c) => (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => prefill(c.id)}
              className="chip whitespace-nowrap text-[13px]"
              style={{
                borderColor:     category === c.id ? c.color + "40" : undefined,
                backgroundColor: category === c.id ? c.color + "12" : undefined,
                color:           category === c.id ? c.color : undefined,
              }}
            >
              {tCat(c.id)}
            </motion.button>
          ))}
        </div>
      </AnimatedItem>

      <div className="flex flex-col gap-5 lg:max-w-[720px] lg:mx-auto">
        {/* Positions — stacked en mobile, 2 cols en tablet+ */}
        <AnimatedItem>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t("ibet")}
              dot="#5de6ff"
              placeholder="Argentina gana"
              value={creatorPos}
              onChange={(e) => setCreatorPos(e.target.value)}
            />
            <Input
              label={t("rivalBets")}
              dot="#f8acff"
              placeholder="Brasil gana"
              value={opponentPos}
              onChange={(e) => setOpponentPos(e.target.value)}
            />
          </div>
        </AnimatedItem>

        {/* Stake chips */}
        <AnimatedItem>
          <div>
            <label className="label">{t("raiseStake")}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[2, 5, 10, 25].map((v) => (
                <motion.button
                  key={v}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStake(v)}
                  className={`py-4 rounded font-mono text-[17px] font-bold cursor-pointer transition-all border-2 focus-ring ${
                    stake === v
                      ? "border-pv-emerald bg-pv-emerald/[0.1] text-pv-emerald shadow-glow-emerald"
                      : "border-white/[0.12] bg-pv-surface text-pv-muted hover:border-white/[0.22]"
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
            label={t("verificationSource")}
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
              {t("deadline")}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {DEADLINE_PRESETS.map((preset) => (
                <motion.button
                  key={preset.seconds}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setDeadlinePreset(preset.seconds);
                    setCustomDeadline("");
                  }}
                  className={`py-2.5 rounded text-sm font-semibold cursor-pointer transition-all border focus-ring ${
                    deadlinePreset === preset.seconds && !customDeadline
                      ? "border-pv-fuch/[0.35] bg-pv-fuch/[0.1] text-pv-fuch"
                      : "border-white/[0.12] bg-pv-surface text-pv-muted hover:border-white/[0.22]"
                  }`}
                >
                  {preset.label}
                </motion.button>
              ))}
            </div>
            <input
              type="datetime-local"
              className="input text-sm"
              value={customDeadline}
              onChange={(e) => setCustomDeadline(e.target.value)}
              placeholder={t("orChooseExactDate")}
            />
          </div>
        </AnimatedItem>

        {/* Submit */}
        <AnimatedItem>
          {isConnected ? (
            <Button variant="primary" onClick={handleSubmit} loading={loading}>
              {loading ? t("funding") : t("createAndFund", { amount: stake })}
            </Button>
          ) : (
            <Button onClick={connect}>{t("connectWallet")}</Button>
          )}
        </AnimatedItem>
      </div>
    </PageTransition>
  );
}
