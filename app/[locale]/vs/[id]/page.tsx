"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import {
  acceptVS,
  cancelVS,
  didUserChallengeVS,
  getRivalryChain,
  getVS,
  getVSChallengerCount,
  getVSSingleWinnerPayout,
  getVSTotalPot,
  hasVSWinner,
  isVSJoinable,
  resolveVS,
  type ClaimChallenger,
  type VSData,
} from "@/lib/contract";
import {
  MIN_STAKE,
  ZERO_ADDRESS,
  getCategoryInfo,
  getShareUrl,
  shortenAddress,
} from "@/lib/constants";
import { SAMPLE_VS } from "@/lib/sampleVs";
import { useCountdown } from "@/lib/hooks";
import { toast } from "sonner";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import {
  Avatar,
  Badge,
  Button,
  CountdownTimer,
  GlassCard,
  Input,
} from "@/components/ui";
import ProvenStamp from "@/components/ProvenStamp";
import ResolutionTerminal from "@/components/ResolutionTerminal";
import Confetti from "@/components/Confetti";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  GitBranch,
  Share2,
  Users,
} from "lucide-react";

function ProgressBar({ state }: { state: string }) {
  const t = useTranslations("vsDetail");
  const steps = [
    t("progressCreated"),
    t("progressAccepted"),
    t("progressVerifying"),
    t("progressProven"),
  ];

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

  if (stepIndex === -1) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((step, index) => {
        const isActive = index <= stepIndex;
        const isCurrent = index === stepIndex;
        return (
          <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full h-0.5 overflow-hidden bg-pv-surface2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: isActive ? "100%" : "0%" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="h-full bg-pv-emerald"
              />
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
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

function formatChallengers(vs: VSData): ClaimChallenger[] {
  if (vs.challengers && vs.challengers.length > 0) {
    return vs.challengers;
  }

  return (vs.challenger_addresses ?? []).map((entry) => ({
    address: entry,
    stake: vs.stake_amount,
    potential_payout:
      vs.odds_mode === "fixed" && (vs.challenger_payout_bps ?? 0) > 0
        ? Math.floor((vs.stake_amount * (vs.challenger_payout_bps ?? 0)) / 10000)
        : getVSTotalPot(vs),
  }));
}

export default function VSDetailPage() {
  const params = useParams();
  const vsId = Number(params.id);
  const isSampleVS = vsId < 0 && !!SAMPLE_VS[vsId];
  const { address, isConnected, connect } = useWallet();
  const t = useTranslations("vsDetail");
  const tc = useTranslations("common");
  const tCat = useTranslations("categories");
  const tStamp = useTranslations("stamp");

  const [vs, setVS] = useState<VSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resolvePhase, setResolvePhase] = useState(-1);
  const [showConfetti, setShowConfetti] = useState(false);
  const [challengeStake, setChallengeStake] = useState("");
  const [rivalryChain, setRivalryChain] = useState<VSData[]>([]);
  const [rivalryLoading, setRivalryLoading] = useState(false);

  const countdown = useCountdown(vs?.deadline || 0);

  const fetchVS = useCallback(async () => {
    if (isSampleVS) {
      setVS(SAMPLE_VS[vsId]);
      setLoading(false);
      return;
    }

    const data = await getVS(vsId);
    setVS(data);
    setLoading(false);
  }, [isSampleVS, vsId]);

  useEffect(() => {
    fetchVS();
    if (isSampleVS) {
      return;
    }

    const intervalId = setInterval(fetchVS, 10000);
    return () => clearInterval(intervalId);
  }, [fetchVS, isSampleVS]);

  useEffect(() => {
    setChallengeStake("");
  }, [vsId]);

  useEffect(() => {
    if (vs && challengeStake === "") {
      setChallengeStake(String(vs.stake_amount));
    }
  }, [challengeStake, vs]);

  useEffect(() => {
    if (isSampleVS || !vs) {
      return;
    }

    let cancelled = false;
    const currentVsId = vs.id;

    async function loadRivalry() {
      setRivalryLoading(true);

      try {
        const ids = await getRivalryChain(currentVsId);
        if (cancelled) {
          return;
        }
        if (ids.length === 0) {
          setRivalryChain([]);
          setRivalryLoading(false);
          return;
        }

        const items = await Promise.all(ids.map((id) => getVS(id)));
        if (cancelled) {
          return;
        }

        setRivalryChain(items.filter((item): item is VSData => item !== null));
      } catch {
        if (!cancelled) {
          setRivalryChain([]);
        }
      } finally {
        if (!cancelled) {
          setRivalryLoading(false);
        }
      }
    }

    loadRivalry();

    return () => {
      cancelled = true;
    };
  }, [isSampleVS, vs]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-10 h-10 border-2 border-transparent border-t-pv-emerald rounded-full animate-spin mx-auto mb-4" />
        <p className="text-pv-muted text-sm">{tc("loading")}</p>
      </div>
    );
  }

  if (!vs) {
    return (
      <div className="text-center py-20">
        <p className="font-display font-bold text-lg mb-4">{t("notFound")}</p>
        <Link href="/">
          <Button variant="primary" fullWidth={false} className="px-8">
            {tc("back")}
          </Button>
        </Link>
      </div>
    );
  }

  const isCreator = address?.toLowerCase() === vs.creator.toLowerCase();
  const isOpponent = didUserChallengeVS(vs, address);
  const canAccept = !isSampleVS && isConnected && isVSJoinable(vs, address);
  const canResolve = !isSampleVS && vs.state === "accepted" && countdown.expired;
  const canCancel = !isSampleVS && vs.state === "open" && isCreator;
  const hasWinner = hasVSWinner(vs);
  const challengerCount = getVSChallengerCount(vs);
  const maxChallengers =
    typeof vs.max_challengers === "number" && vs.max_challengers > 0
      ? vs.max_challengers
      : 1;
  const hasAnyChallenger = challengerCount > 0;
  const isOneToMany = maxChallengers > 1;
  const isOpen = !hasAnyChallenger;
  const pool = getVSTotalPot(vs);
  const challengers = formatChallengers(vs);
  const resolvedPayout = getVSSingleWinnerPayout(vs);
  const winnerTitle = !hasWinner
    ? tStamp("draw")
    : vs.winner_side === "challengers" && challengerCount > 1
    ? tStamp("challengersWon")
    : tStamp("won", { address: shortenAddress(vs.winner) });
  const winnerAmountLabel =
    !hasWinner ? null : resolvedPayout === null ? `$${pool}` : `+$${resolvedPayout}`;
  const categoryInfo = getCategoryInfo(vs.category);
  const marketType = vs.market_type ?? "binary";
  const oddsMode = vs.odds_mode ?? "pool";
  const challengeStakeValue = Number(challengeStake);
  const hasValidChallengeStake =
    Number.isFinite(challengeStakeValue) && challengeStakeValue >= MIN_STAKE;
  const fixedPayoutPreview =
    oddsMode === "fixed" &&
    hasValidChallengeStake &&
    typeof vs.challenger_payout_bps === "number" &&
    vs.challenger_payout_bps > 0
      ? Math.floor((challengeStakeValue * vs.challenger_payout_bps) / 10000)
      : null;
  const showRivalrySection =
    rivalryLoading ||
    rivalryChain.length > 1 ||
    !!vs.parent_id ||
    vs.state === "resolved" ||
    vs.state === "cancelled";

  async function handleAccept() {
    if (!address) {
      return;
    }
    if (!hasValidChallengeStake) {
      toast.error(t("invalidChallengeStakeMin", { amount: MIN_STAKE }));
      return;
    }

    setActionLoading("accept");
    try {
      await acceptVS(address, vsId, challengeStakeValue);
      toast.success(
        t("joinedToast", {
          amount: challengeStakeValue,
          total: pool + challengeStakeValue,
        })
      );
      fetchVS();
    } catch (err: any) {
      toast.error(err.message || t("errorAccepting"));
    }
    setActionLoading(null);
  }

  async function handleResolve() {
    if (!address) {
      return;
    }
    setActionLoading("resolve");
    setResolvePhase(0);

    const t1 = setTimeout(() => setResolvePhase(1), 1500);
    const t2 = setTimeout(() => setResolvePhase(2), 3200);
    const t3 = setTimeout(() => setResolvePhase(3), 4800);

    try {
      await resolveVS(address, vsId);
      toast.success(t("proven"));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      fetchVS();
    } catch (err: any) {
      toast.error(err.message || t("errorResolving"));
    }
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);
    setResolvePhase(-1);
    setActionLoading(null);
  }

  async function handleCancel() {
    if (!address) {
      return;
    }
    setActionLoading("cancel");
    try {
      await cancelVS(address, vsId);
      toast.success(t("cancelledToast"));
      fetchVS();
    } catch (err: any) {
      toast.error(err.message || t("errorCancelling"));
    }
    setActionLoading(null);
  }

  return (
    <>
      <Confetti active={showConfetti} />
      <div className="fixed inset-0 rivalry-bg pointer-events-none" style={{ zIndex: 0 }} />
      <PageTransition>
        <AnimatedItem>
          <Link
            href={isConnected ? "/dashboard" : "/"}
            className="inline-flex items-center gap-1.5 text-sm text-pv-muted hover:text-pv-text mb-5 transition-colors"
          >
            <ArrowLeft size={14} />
            {tc("back")}
          </Link>
        </AnimatedItem>

        {vs.state !== "cancelled" && (
          <AnimatedItem>
            <ProgressBar state={vs.state} />
          </AnimatedItem>
        )}

        <AnimatedItem>
          <div className="mb-6 lg:max-w-[800px] lg:mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-pv-emerald shadow-[0_0_8px_rgba(78,222,163,0.6)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald">
                {t("eyebrow")}
              </span>
            </div>
            <p className="mt-4 text-sm sm:text-base text-pv-muted leading-relaxed max-w-[700px]">
              {t("subtitle")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-[0.12em] border"
                style={{
                  backgroundColor: `${categoryInfo.color}14`,
                  borderColor: `${categoryInfo.color}4A`,
                  color: categoryInfo.color,
                }}
              >
                {tCat(categoryInfo.id)}
              </span>
              <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-[0.12em] border border-pv-cyan/[0.25] bg-pv-cyan/[0.08] text-pv-cyan">
                {t(`marketTypes.${marketType}`)}
              </span>
              <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-[0.12em] border border-pv-fuch/[0.25] bg-pv-fuch/[0.08] text-pv-fuch">
                {isOneToMany
                  ? t("oneToManySummary", { count: maxChallengers })
                  : t("headToHeadSummary")}
              </span>
              <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-[0.12em] border border-pv-gold/[0.25] bg-pv-gold/[0.08] text-pv-gold">
                {t("pool")}: ${pool}
              </span>
              <Badge status={vs.state} />
            </div>
          </div>
        </AnimatedItem>

        {vs.state === "resolved" && resolvePhase === -1 && (
          <AnimatedItem>
            <ProvenStamp
              title={winnerTitle}
              amountLabel={winnerAmountLabel}
              resolutionSummary={vs.resolution_summary}
            />
          </AnimatedItem>
        )}

        {actionLoading === "resolve" && (
          <AnimatedItem>
            <ResolutionTerminal phase={resolvePhase} url={vs.resolution_url} />
          </AnimatedItem>
        )}

        {(vs.state !== "resolved" || resolvePhase !== -1) && actionLoading !== "resolve" && (
          <AnimatedItem>
            <GlassCard glow="both" noPad className="mb-5 lg:max-w-[800px] lg:mx-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-5">
                  {vs.state === "open" && !isCreator ? (
                    <div className="text-sm font-bold text-pv-fuch">
                      {t("challengesYou", { address: shortenAddress(vs.creator) })}
                    </div>
                  ) : (
                    <Badge status={vs.state} large />
                  )}
                  <span className="font-mono text-[11px] text-pv-muted">#{vs.id}</span>
                </div>

                <h1 className="font-display text-[clamp(28px,8.5vw,46px)] font-bold leading-[0.92] tracking-tight mb-7">
                  {vs.question}
                </h1>

                <div className="flex flex-col sm:flex-row overflow-hidden border border-white/[0.12] mb-6">
                  <div className="flex-1 p-4 bg-pv-cyan/[0.04]">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar side="creator" size={28} />
                      <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-cyan/60">
                        {t("creator")}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      {shortenAddress(vs.creator)}
                      {isCreator && (
                        <span className="text-pv-emerald text-[10px] ml-1">{t("you")}</span>
                      )}
                    </div>
                    <div className="text-xs text-pv-cyan mt-1">{vs.creator_position}</div>
                  </div>

                  <div className="w-full h-px sm:w-px sm:h-auto bg-white/[0.08] flex items-center justify-center relative">
                    <span className="absolute bg-pv-surface2 text-pv-muted text-[10px] font-bold px-1.5 py-0.5">
                      VS
                    </span>
                  </div>

                  <div className="flex-1 p-4 bg-pv-fuch/[0.04]">
                    {isOpen ? (
                      <div className="text-center py-2">
                        <div className="w-7 h-7 border-2 border-dashed border-white/[0.2] flex items-center justify-center mx-auto mb-2 text-pv-muted font-bold text-xs">
                          ?
                        </div>
                        <div className="text-xs text-pv-muted italic">{t("waitingRival")}</div>
                      </div>
                    ) : challengerCount === 1 ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar side="opponent" size={28} />
                          <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-fuch/60">
                            {t("rival")}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">
                          {shortenAddress(vs.opponent)}
                          {isOpponent && (
                            <span className="text-pv-emerald text-[10px] ml-1">{t("you")}</span>
                          )}
                        </div>
                        <div className="text-xs text-pv-fuch mt-1">{vs.opponent_position}</div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Users size={15} className="text-pv-fuch" />
                          <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-fuch/60">
                            {t("challengerSide")}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">
                          {t("challengersJoined", { count: challengerCount })}
                        </div>
                        <div className="text-xs text-pv-fuch mt-1">{vs.counter_position}</div>
                        <div className="text-xs text-pv-muted mt-2">
                          {t("slotsFilled", { count: challengerCount, total: maxChallengers })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-pv-surface2 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                      {t("pool")}
                    </div>
                    <div className="font-mono text-2xl font-bold text-pv-gold">${pool}</div>
                  </div>
                  <div className="bg-pv-surface2 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                      {t("creatorStake")}
                    </div>
                    <div className="font-mono text-2xl font-bold text-pv-cyan">
                      ${vs.creator_stake ?? vs.stake_amount}
                    </div>
                  </div>
                  <div className="bg-pv-surface2 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                      {t("deadline")}
                    </div>
                    <CountdownTimer deadline={vs.deadline} className="text-xl" />
                  </div>
                  <div className="bg-pv-surface2 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                      {t("slots")}
                    </div>
                    <div className="font-mono text-2xl font-bold text-pv-fuch">
                      {challengerCount}/{maxChallengers}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.08] px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-pv-emerald shadow-[0_0_8px_rgba(78,222,163,0.6)]" />
                  <span className="text-xs text-pv-muted">{t("provenVerifies")}</span>
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
                    {t("source")}
                  </a>
                )}
              </div>
            </GlassCard>
          </AnimatedItem>
        )}

        <AnimatedItem>
          <GlassCard className="mb-5 lg:max-w-[800px] lg:mx-auto">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-pv-emerald/80 mb-1">
              {t("marketTerms")}
            </div>
            <p className="text-sm text-pv-muted mb-4">{t("marketTermsHint")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-pv-surface2 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                  {t("marketType")}
                </div>
                <div className="font-semibold">{t(`marketTypes.${marketType}`)}</div>
              </div>
              <div className="bg-pv-surface2 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                  {t("oddsMode")}
                </div>
                <div className="font-semibold">{t(`oddsModes.${oddsMode}`)}</div>
              </div>
              <div className="bg-pv-surface2 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                  {t("format")}
                </div>
                <div className="font-semibold">
                  {isOneToMany
                    ? t("oneToManySummary", { count: maxChallengers })
                    : t("headToHeadSummary")}
                </div>
              </div>
              <div className="bg-pv-surface2 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                  {t("challengerCapacity")}
                </div>
                <div className="font-semibold">
                  {t("slotsFilled", { count: challengerCount, total: maxChallengers })}
                </div>
              </div>
              {oddsMode === "fixed" && typeof vs.challenger_payout_bps === "number" && (
                <div className="bg-pv-surface2 p-4 sm:col-span-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                    {t("fixedPayout")}
                  </div>
                  <div className="font-semibold">
                    {(vs.challenger_payout_bps / 10000).toFixed(2)}x
                  </div>
                </div>
              )}
              {vs.handicap_line && (
                <div className="bg-pv-surface2 p-4 sm:col-span-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                    {t("handicapLine")}
                  </div>
                  <div className="font-semibold">{vs.handicap_line}</div>
                </div>
              )}
              {vs.settlement_rule && (
                <div className="bg-pv-surface2 p-4 sm:col-span-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                    {t("settlementRule")}
                  </div>
                  <div className="font-semibold leading-relaxed">{vs.settlement_rule}</div>
                </div>
              )}
            </div>
          </GlassCard>
        </AnimatedItem>

        <AnimatedItem>
          <GlassCard className="mb-5 lg:max-w-[800px] lg:mx-auto">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-pv-fuch/80 mb-1">
              {t("challengers")}
            </div>
            <p className="text-sm text-pv-muted mb-4">
              {t("slotsFilled", { count: challengerCount, total: maxChallengers })}
            </p>
            {challengers.length === 0 ? (
              <p className="text-sm text-pv-muted">{t("noChallengersYet")}</p>
            ) : (
              <div className="space-y-3">
                {challengers.map((challenger, index) => (
                  <div
                    key={`${challenger.address}-${index}`}
                    className="bg-pv-surface2 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        {shortenAddress(challenger.address)}
                        {address &&
                          challenger.address.toLowerCase() === address.toLowerCase() && (
                            <span className="text-pv-emerald text-[10px] ml-1">
                              {t("you")}
                            </span>
                          )}
                      </div>
                      <div className="text-xs text-pv-muted mt-1">{vs.counter_position}</div>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-pv-muted mb-1">
                          {t("challengerStake")}
                        </div>
                        <div className="font-mono font-semibold text-pv-fuch">
                          ${challenger.stake}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-pv-muted mb-1">
                          {t("potentialPayout")}
                        </div>
                        <div className="font-mono font-semibold text-pv-gold">
                          ${challenger.potential_payout}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </AnimatedItem>

        {showRivalrySection && (
          <AnimatedItem>
            <GlassCard className="mb-5 lg:max-w-[800px] lg:mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-pv-emerald/80">
                    {t("rivalry")}
                  </div>
                  <p className="text-sm text-pv-muted mt-1">{t("rivalryHint")}</p>
                </div>
                {!isSampleVS && (vs.state === "resolved" || vs.state === "cancelled") && (
                  <Link href={`/vs/create?rematch=${vs.id}`}>
                    <Button variant="emerald" fullWidth={false} size="sm">
                      {t("createRematch")}
                    </Button>
                  </Link>
                )}
              </div>

              {rivalryLoading ? (
                <p className="text-sm text-pv-muted">{tc("loading")}</p>
              ) : rivalryChain.length > 1 ? (
                <div className="space-y-3">
                  {rivalryChain.map((entry, index) => (
                    <Link key={entry.id} href={`/vs/${entry.id}`} className="block">
                      <div
                        className={`p-4 border transition-colors ${
                          entry.id === vs.id
                            ? "border-pv-emerald/[0.35] bg-pv-emerald/[0.08]"
                            : "border-white/[0.12] bg-pv-surface2 hover:border-white/[0.22]"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 text-pv-muted text-xs font-bold uppercase tracking-[0.14em]">
                            <GitBranch size={12} />
                            {t("roundLabel", { round: index + 1 })}
                          </div>
                          <Badge status={entry.state} />
                        </div>
                        <div className="font-semibold">{entry.question}</div>
                        <div className="text-xs text-pv-muted mt-1">
                          {t("pool")}: ${getVSTotalPot(entry)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-pv-muted">{t("rivalryEmpty")}</p>
              )}
            </GlassCard>
          </AnimatedItem>
        )}

        {!isSampleVS ? (
          <AnimatedItem>
            <div className="flex flex-col gap-3 lg:max-w-[800px] lg:mx-auto">
              {canAccept && (
                <GlassCard>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                    <Input
                      label={t("challengeStake")}
                      type="number"
                      min={MIN_STAKE}
                      step="1"
                      value={challengeStake}
                      onChange={(event) => setChallengeStake(event.target.value)}
                    />
                    <Button
                      variant="fuch"
                      onClick={handleAccept}
                      loading={actionLoading === "accept"}
                      disabled={!hasValidChallengeStake}
                    >
                      {actionLoading === "accept"
                        ? t("accepting")
                        : isOneToMany
                        ? t("joinAndStake", {
                            amount: hasValidChallengeStake ? challengeStakeValue : vs.stake_amount,
                          })
                        : t("acceptAndStake", {
                            amount: hasValidChallengeStake ? challengeStakeValue : vs.stake_amount,
                          })}
                    </Button>
                  </div>
                  <p className="text-xs text-pv-muted mt-3">
                    {fixedPayoutPreview !== null
                      ? t("challengeStakeHintFixed", { payout: fixedPayoutPreview })
                      : isOneToMany
                      ? t("challengeStakeHintPool")
                      : t("challengeStakeHintHeadToHead")}
                  </p>
                  <p className="text-xs text-pv-muted mt-2">
                    {t("minimumStakeHint", { amount: MIN_STAKE })}
                  </p>
                </GlassCard>
              )}

              {vs.state === "open" && !isConnected && (
                <Button onClick={connect}>{t("connectToAccept")}</Button>
              )}

              {canResolve && actionLoading !== "resolve" && (
                <Button variant="emerald" onClick={handleResolve}>
                  {t("resolveVS")}
                </Button>
              )}

              {vs.state === "accepted" && !countdown.expired && actionLoading !== "resolve" && (
                <GlassCard className="text-center">
                  <p className="text-sm text-pv-muted">{t("waitingDeadline")}</p>
                </GlassCard>
              )}

              {(vs.state === "open" || (isOneToMany && isVSJoinable(vs))) && isCreator && (
                <GlassCard>
                  <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Share2 size={14} className="text-pv-cyan" />
                    {isOneToMany ? t("sendLinkToChallengers") : t("sendLink")}
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
                        toast.success(tc("copied"));
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-4 py-3 rounded bg-pv-emerald text-pv-bg font-bold text-sm flex items-center gap-1.5 hover:brightness-110 transition-all focus-ring"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? tc("copied") : tc("copy")}
                    </button>
                  </div>
                </GlassCard>
              )}

              {canCancel && (
                <Button
                  variant="danger"
                  onClick={handleCancel}
                  loading={actionLoading === "cancel"}
                >
                  {actionLoading === "cancel" ? t("cancelling") : t("cancelVS")}
                </Button>
              )}
            </div>
          </AnimatedItem>
        ) : (
          <AnimatedItem>
            <GlassCard className="text-center">
              <p className="text-sm text-pv-muted">{t("sampleMode")}</p>
              <div className="mt-3 flex justify-center">
                <Link href="/vs/create" className="block w-full sm:w-auto">
                  <Button variant="primary" fullWidth={false}>
                    {t("sampleModeCTA")}
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </AnimatedItem>
        )}
      </PageTransition>
    </>
  );
}
