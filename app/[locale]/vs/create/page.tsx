"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import {
  createClaim,
  createRematch,
  getVS,
  type CreateClaimParams,
  type VSData,
} from "@/lib/contract";
import {
  CATEGORY_DEMO_GUIDANCE,
  CATEGORIES,
  MIN_STAKE,
  PREFILLS,
  getShareUrl,
  normalizeResolutionSource,
} from "@/lib/constants";
import { toast } from "sonner";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { GlassCard, Button, Input } from "@/components/ui";
import Confetti from "@/components/Confetti";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  GitBranch,
  SlidersHorizontal,
  Users,
} from "lucide-react";

const MARKET_TYPES = [
  "binary",
  "moneyline",
  "spread",
  "total",
  "prop",
  "custom",
] as const;

const ODDS_MODES = ["pool", "fixed"] as const;

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected, connect } = useWallet();
  const t = useTranslations("create");
  const tc = useTranslations("common");
  const tCat = useTranslations("categories");

  const DEADLINE_PRESETS = [
    { label: t("presets.1h"), seconds: 3600 },
    { label: t("presets.24h"), seconds: 86400 },
    { label: t("presets.3days"), seconds: 259200 },
    { label: t("presets.1week"), seconds: 604800 },
  ];

  const [question, setQuestion] = useState("");
  const [creatorPos, setCreatorPos] = useState("");
  const [opponentPos, setOpponentPos] = useState("");
  const [url, setUrl] = useState("");
  const [deadlinePreset, setDeadlinePreset] = useState(7200);
  const [customDeadline, setCustomDeadline] = useState("");
  const [stake, setStake] = useState(5);
  const [category, setCategory] = useState("custom");
  const [marketType, setMarketType] =
    useState<CreateClaimParams["market_type"]>("binary");
  const [oddsMode, setOddsMode] = useState<CreateClaimParams["odds_mode"]>("pool");
  const [fixedOddsMultiple, setFixedOddsMultiple] = useState("2.00");
  const [handicapLine, setHandicapLine] = useState("");
  const [settlementRule, setSettlementRule] = useState("");
  const [maxChallengers, setMaxChallengers] = useState(1);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingParent, setLoadingParent] = useState(false);
  const [created, setCreated] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [rematchSource, setRematchSource] = useState<VSData | null>(null);
  const [hydratedFromRematch, setHydratedFromRematch] = useState(false);
  const [rematchId, setRematchId] = useState<number | null>(null);

  const categoryGuidance =
    CATEGORY_DEMO_GUIDANCE[category as keyof typeof CATEGORY_DEMO_GUIDANCE] ??
    CATEGORY_DEMO_GUIDANCE.custom;
  const guidanceKey =
    category in CATEGORY_DEMO_GUIDANCE ? category : "custom";
  const isOneToMany = maxChallengers > 1;
  const isAdvancedClaim =
    marketType !== "binary" ||
    oddsMode !== "pool" ||
    isOneToMany ||
    handicapLine.trim().length > 0 ||
    settlementRule.trim().length > 0;

  const payoutPreview = useMemo(() => {
    const multiple = Number(fixedOddsMultiple);
    if (!Number.isFinite(multiple) || multiple < 1) {
      return null;
    }
    return Math.round(stake * multiple * 100) / 100;
  }, [fixedOddsMultiple, stake]);

  const normalizedSourceUrl = useMemo(() => normalizeResolutionSource(url), [url]);
  const requiresExplicitSettlementRule =
    category === "custom" || marketType !== "binary" || handicapLine.trim().length > 0;
  const qualityWarnings = useMemo(() => {
    const warnings: string[] = [];

    if (question.trim().length < 24) {
      warnings.push(t("qualitySpecificity"));
    }
    if (!normalizedSourceUrl) {
      warnings.push(t("qualitySource"));
    }
    if (requiresExplicitSettlementRule && settlementRule.trim().length < 16) {
      warnings.push(t("qualitySettlement"));
    }

    return warnings;
  }, [normalizedSourceUrl, question, requiresExplicitSettlementRule, settlementRule, t]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawRematchId = Number(new URL(window.location.href).searchParams.get("rematch") ?? "");
    setRematchId(Number.isInteger(rawRematchId) && rawRematchId > 0 ? rawRematchId : null);
  }, []);

  useEffect(() => {
    if (!rematchId || hydratedFromRematch) {
      return;
    }

    let cancelled = false;
    const currentRematchId = rematchId;

    async function loadRematchSource() {
      setLoadingParent(true);
      const source = await getVS(currentRematchId);
      if (cancelled) {
        return;
      }

      if (!source) {
        toast.error(t("rematchNotFound"));
        setLoadingParent(false);
        return;
      }

      setRematchSource(source);
      setQuestion(source.question);
      setCreatorPos(source.creator_position);
      setOpponentPos(source.counter_position ?? source.opponent_position);
      setUrl(source.resolution_url);
      setStake(source.creator_stake ?? source.stake_amount);
      setCategory(source.category || "custom");
      setMarketType(source.market_type ?? "binary");
      setOddsMode(source.odds_mode ?? "pool");
      setFixedOddsMultiple(
        source.challenger_payout_bps && source.challenger_payout_bps > 0
          ? (source.challenger_payout_bps / 10000).toFixed(2)
          : "2.00"
      );
      setHandicapLine(source.handicap_line ?? "");
      setSettlementRule(source.settlement_rule ?? "");
      setMaxChallengers(
        source.max_challengers && source.max_challengers > 0
          ? source.max_challengers
          : 1
      );
      setAdvancedOpen(
        (source.market_type ?? "binary") !== "binary" ||
          (source.odds_mode ?? "pool") !== "pool" ||
          (source.max_challengers ?? 1) > 1 ||
          Boolean(source.handicap_line) ||
          Boolean(source.settlement_rule)
      );
      setHydratedFromRematch(true);
      setLoadingParent(false);
    }

    loadRematchSource();

    return () => {
      cancelled = true;
    };
  }, [hydratedFromRematch, rematchId, t]);

  function prefill(catId: string) {
    setCategory(catId);
    const prefillValues = PREFILLS[catId];
    if (prefillValues) {
      setQuestion(prefillValues.q);
      setCreatorPos(prefillValues.a);
      setOpponentPos(prefillValues.b);
      setUrl(prefillValues.u);
      if (!settlementRule.trim()) {
        setSettlementRule(t(`guidance.${catId}.settlementTemplate`));
      }
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

    if (!Number.isFinite(stake) || stake < MIN_STAKE) {
      toast.error(t("invalidStakeMin", { amount: MIN_STAKE }));
      return;
    }

    const deadlineTimestamp = customDeadline
      ? Math.floor(new Date(customDeadline).getTime() / 1000)
      : Math.floor(Date.now() / 1000) + deadlinePreset;

    if (!Number.isFinite(deadlineTimestamp) || deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
      toast.error(t("invalidDeadline"));
      return;
    }

    const fixedMultiple = Number(fixedOddsMultiple);
    if (oddsMode === "fixed" && (!Number.isFinite(fixedMultiple) || fixedMultiple < 1)) {
      toast.error(t("invalidFixedOdds"));
      return;
    }

    if (!normalizedSourceUrl) {
      toast.error(t("sourceRequired"));
      return;
    }

    if (requiresExplicitSettlementRule && settlementRule.trim().length < 16) {
      toast.error(t("settlementRuleRequired"));
      return;
    }

    const normalizedMaxChallengers = Math.max(1, Math.min(100, Math.floor(maxChallengers)));
    const params: CreateClaimParams = {
      question,
      creator_position: creatorPos,
      counter_position: opponentPos,
      resolution_url: normalizedSourceUrl,
      deadline: deadlineTimestamp,
      stake_amount: stake,
      category,
      market_type: marketType,
      odds_mode: oddsMode,
      challenger_payout_bps:
        oddsMode === "fixed" ? Math.round(fixedMultiple * 10000) : 0,
      handicap_line: handicapLine.trim(),
      settlement_rule: settlementRule.trim(),
      max_challengers: normalizedMaxChallengers,
    };

    setLoading(true);

    try {
      const result = rematchId
        ? await createRematch(address, rematchId, params)
        : await createClaim(address, params);

      toast.success(
        rematchId ? t("rematchCreatedAndFunded") : t("vsCreatedAndFunded")
      );
      if (result.claimId) {
        setCreated(result.claimId);
      } else {
        router.push("/dashboard");
      }
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    } catch (err: any) {
      toast.error(err.message || t("errorCreating"));
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!created) {
      return;
    }
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
                {rematchId ? t("rematchCreatedAndFunded") : t("vsCreatedAndFunded")}
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
                  href={`https://wa.me/?text=${encodeURIComponent(`Challenge me on PROVEN: ${getShareUrl(created)}`)}`}
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
                    setHandicapLine("");
                    setSettlementRule("");
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
          {rematchId && (
            <GlassCard className="mb-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-pv-emerald/[0.12] border border-pv-emerald/[0.22] flex items-center justify-center text-pv-emerald shrink-0">
                  <GitBranch size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-pv-emerald/80">
                    {t("rematchEyebrow")}
                  </div>
                  <p className="text-sm font-semibold mt-1">
                    {t("rematchFrom", { id: rematchId })}
                  </p>
                  <p className="text-sm text-pv-muted mt-1">
                    {loadingParent
                      ? t("rematchLoading")
                      : rematchSource
                      ? t("rematchHint")
                      : t("rematchPending")}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

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

      <AnimatedItem>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:max-w-[720px] lg:mx-auto mb-6">
          <GlassCard className="py-4">
            <div className="flex items-center gap-2 text-pv-cyan mb-2">
              <SlidersHorizontal size={14} />
              <span className="text-xs font-bold uppercase tracking-[0.16em]">
                {t("marketType")}
              </span>
            </div>
            <div className="text-sm font-semibold">
              {t(`marketTypes.${marketType}`)}
            </div>
          </GlassCard>
          <GlassCard className="py-4">
            <div className="flex items-center gap-2 text-pv-fuch mb-2">
              <Users size={14} />
              <span className="text-xs font-bold uppercase tracking-[0.16em]">
                {t("format")}
              </span>
            </div>
            <div className="text-sm font-semibold">
              {isOneToMany
                ? t("oneToManySummary", { count: maxChallengers })
                : t("headToHeadSummary")}
            </div>
          </GlassCard>
          <GlassCard className="py-4">
            <div className="flex items-center gap-2 text-pv-gold mb-2">
              <GitBranch size={14} />
              <span className="text-xs font-bold uppercase tracking-[0.16em]">
                {t("pricing")}
              </span>
            </div>
            <div className="text-sm font-semibold">
              {t(`oddsModes.${oddsMode}`)}
            </div>
          </GlassCard>
        </div>
      </AnimatedItem>

      <AnimatedItem>
        <textarea
          rows={3}
          className="w-full lg:max-w-[720px] lg:mx-auto block py-6 bg-transparent border-b-2 border-white/[0.1] text-pv-text placeholder:text-pv-muted font-display font-bold text-[clamp(24px,4vw,36px)] leading-[1.05] tracking-tight resize-none outline-none mb-7 focus:border-pv-emerald/50 transition-colors"
          placeholder={t("whatWillHappen")}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
      </AnimatedItem>

      <AnimatedItem>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none lg:max-w-[720px] lg:mx-auto">
          {CATEGORIES.filter((entry) => entry.id !== "custom").map((entry) => (
            <motion.button
              key={entry.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => prefill(entry.id)}
              className="chip whitespace-nowrap text-[13px]"
              style={{
                borderColor: category === entry.id ? `${entry.color}40` : undefined,
                backgroundColor: category === entry.id ? `${entry.color}12` : undefined,
                color: category === entry.id ? entry.color : undefined,
              }}
            >
              {tCat(entry.id)}
            </motion.button>
          ))}
        </div>
      </AnimatedItem>

      <div className="flex flex-col gap-5 lg:max-w-[720px] lg:mx-auto">
        <AnimatedItem>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t("ibet")}
              dot="#5de6ff"
              placeholder="Argentina wins"
              value={creatorPos}
              onChange={(event) => setCreatorPos(event.target.value)}
            />
            <Input
              label={isOneToMany ? t("challengerSideBets") : t("rivalBets")}
              dot="#f8acff"
              placeholder="Brazil wins or draws"
              value={opponentPos}
              onChange={(event) => setOpponentPos(event.target.value)}
            />
          </div>
        </AnimatedItem>

        <AnimatedItem>
          <div>
            <label className="label">{t("raiseStake")}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[MIN_STAKE, 5, 10, 25].map((amount) => (
                <motion.button
                  key={amount}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStake(amount)}
                  className={`py-4 rounded font-mono text-[17px] font-bold cursor-pointer transition-all border-2 focus-ring ${
                    stake === amount
                      ? "border-pv-emerald bg-pv-emerald/[0.1] text-pv-emerald shadow-glow-emerald"
                      : "border-white/[0.12] bg-pv-surface text-pv-muted hover:border-white/[0.22]"
                  }`}
                >
                  ${amount}
                </motion.button>
              ))}
            </div>
            <p className="text-xs text-pv-muted mt-2">
              {t("minimumStakeHint", { amount: MIN_STAKE })}
            </p>
          </div>
        </AnimatedItem>

        <AnimatedItem>
          <Input
            label={t("verificationSource")}
            mono
            placeholder="espn.com, weather.com..."
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <GlassCard className="mt-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-pv-cyan/80 mb-2">
              {t("sourceGuidance")}
            </div>
            <p className="text-sm text-pv-muted mb-3">
              {t(`guidance.${guidanceKey}.sourceHint`)}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {categoryGuidance.sourceExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setUrl(example)}
                  className="chip text-[11px] text-pv-muted hover:text-pv-cyan hover:border-pv-cyan/[0.3] transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
            <p className="text-xs text-pv-muted">
              {t(`guidance.${guidanceKey}.questionHint`)}
            </p>
          </GlassCard>
        </AnimatedItem>

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
              className="input text-sm focus-ring"
              value={customDeadline}
              onChange={(event) => setCustomDeadline(event.target.value)}
              placeholder={t("orChooseExactDate")}
            />
          </div>
        </AnimatedItem>

        <AnimatedItem>
          <GlassCard className="p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div>
                <div className="label mb-1">{t("advancedToggle")}</div>
                <p className="text-sm text-pv-muted">{t("advancedHint")}</p>
              </div>
              {advancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {advancedOpen && (
              <div className="px-5 pb-5 border-t border-white/[0.08] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  <div>
                    <label className="label">{t("marketType")}</label>
                    <select
                      value={marketType}
                      onChange={(event) =>
                        setMarketType(event.target.value as CreateClaimParams["market_type"])
                      }
                      className="input focus-ring"
                    >
                      {MARKET_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {t(`marketTypes.${value}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">{t("oddsMode")}</label>
                    <select
                      value={oddsMode}
                      onChange={(event) =>
                        setOddsMode(event.target.value as CreateClaimParams["odds_mode"])
                      }
                      className="input focus-ring"
                    >
                      {ODDS_MODES.map((value) => (
                        <option key={value} value={value}>
                          {t(`oddsModes.${value}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {oddsMode === "fixed" && (
                  <div>
                    <Input
                      label={t("fixedOddsLabel")}
                      type="number"
                      min={1}
                      step="0.01"
                      value={fixedOddsMultiple}
                      onChange={(event) => setFixedOddsMultiple(event.target.value)}
                    />
                    <p className="text-xs text-pv-muted mt-2">
                      {t("fixedOddsHint")}
                      {payoutPreview !== null ? ` ${t("fixedOddsPreview", { amount: payoutPreview })}` : ""}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t("maxChallengers")}</label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {[1, 2, 5, 10].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setMaxChallengers(value)}
                          className={`py-2 rounded border text-sm font-semibold transition-colors ${
                            maxChallengers === value
                              ? "border-pv-emerald/[0.35] bg-pv-emerald/[0.12] text-pv-emerald"
                              : "border-white/[0.12] text-pv-muted hover:border-white/[0.22]"
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={String(maxChallengers)}
                      onChange={(event) =>
                        setMaxChallengers(Number(event.target.value || 1))
                      }
                    />
                    <p className="text-xs text-pv-muted mt-2">
                      {t("slotsHelp")}
                    </p>
                  </div>

                  <Input
                    label={t("handicapLine")}
                    placeholder={t("handicapPlaceholder")}
                    value={handicapLine}
                    onChange={(event) => setHandicapLine(event.target.value)}
                  />
                </div>

                <div>
                  <label className="label">{t("settlementRule")}</label>
                  <textarea
                    rows={4}
                    className="input focus-ring min-h-[110px]"
                    placeholder={t("settlementPlaceholder")}
                    value={settlementRule}
                    onChange={(event) => setSettlementRule(event.target.value)}
                  />
                  <p className="text-xs text-pv-muted mt-2">
                    {t("settlementRuleHint")}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setSettlementRule(t(`guidance.${guidanceKey}.settlementTemplate`))
                    }
                    className="mt-3 text-xs font-semibold text-pv-emerald hover:text-pv-text transition-colors"
                  >
                    {t("useRecommendedRule")}
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </AnimatedItem>

        <AnimatedItem>
          <GlassCard className="py-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-pv-gold/80 mb-2">
              {t("qualityReview")}
            </div>
            {qualityWarnings.length === 0 ? (
              <p className="text-sm text-pv-muted">{t("qualityReady")}</p>
            ) : (
              <div className="space-y-2">
                {qualityWarnings.map((warning) => (
                  <p key={warning} className="text-sm text-pv-muted">
                    - {warning}
                  </p>
                ))}
              </div>
            )}
          </GlassCard>
        </AnimatedItem>

        <AnimatedItem>
          <GlassCard className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1">
                  {t("marketType")}
                </div>
                <div className="font-semibold">{t(`marketTypes.${marketType}`)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1">
                  {t("oddsMode")}
                </div>
                <div className="font-semibold">{t(`oddsModes.${oddsMode}`)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1">
                  {t("format")}
                </div>
                <div className="font-semibold">
                  {isOneToMany
                    ? t("oneToManySummary", { count: maxChallengers })
                    : t("headToHeadSummary")}
                </div>
              </div>
            </div>
            {(handicapLine || settlementRule || isAdvancedClaim) && (
              <div className="border-t border-white/[0.08] mt-4 pt-4 text-sm text-pv-muted space-y-2">
                {handicapLine && (
                  <p>
                    <span className="text-pv-text font-semibold">{t("handicapLine")}:</span>{" "}
                    {handicapLine}
                  </p>
                )}
                {settlementRule && (
                  <p>
                    <span className="text-pv-text font-semibold">{t("settlementRule")}:</span>{" "}
                    {settlementRule}
                  </p>
                )}
              </div>
            )}
          </GlassCard>
        </AnimatedItem>

        <AnimatedItem>
          {isConnected ? (
            <Button variant="cyan" onClick={handleSubmit} loading={loading}>
              {loading
                ? t("funding")
                : rematchId
                ? t("createRematchAndFund", { amount: stake })
                : t("createAndFund", { amount: stake })}
            </Button>
          ) : (
            <Button onClick={connect}>{t("connectWallet")}</Button>
          )}
        </AnimatedItem>
      </div>
    </PageTransition>
  );
}
