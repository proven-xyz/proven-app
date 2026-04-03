"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import { getUserVSFast, type VSData } from "@/lib/contract";
import { shortenAddress } from "@/lib/constants";
import { isXmtpFeatureEnabled } from "@/lib/xmtp/config";
import {
  VS_XMTP_CHAT_ANCHOR_ID,
  canOpenVsXmtpChat,
  getVsXmtpPeerAddress,
  getVsXmtpUnavailableReason,
  isSampleVsIdForXmtp,
} from "@/lib/xmtp/vs-chat-eligibility";
import { getVSTotalPot } from "@/lib/contract";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { Button, GlassCard } from "@/components/ui";
import MessagesWalletGate from "@/components/xmtp/MessagesWalletGate";
import MessagesPageHero from "@/components/xmtp/MessagesPageHero";
import {
  ArrowRight,
  ChevronRight,
  Radio,
  Lock,
  Zap,
  Clock,
  Ban,
  AlertCircle,
} from "lucide-react";

function truncateQuestion(q: string, max = 72): string {
  const t = q.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

const HUB_SHELL = "mx-auto w-full max-w-[720px] px-4 pb-16 sm:px-6";
const CONTENT_DIVIDER = "mt-6 border-t border-white/[0.06] pt-8 sm:mt-8 sm:pt-10";

function ChannelListSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[4.75rem] rounded-xl border border-white/[0.08] bg-pv-surface2/40 animate-pulse sm:h-[5.25rem]"
        />
      ))}
    </div>
  );
}

export default function MessagesHub() {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const t = useTranslations("messagesHub");
  const featureOn = useMemo(() => isXmtpFeatureEnabled(), []);

  const [duels, setDuels] = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!address) {
        setDuels([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(false);
      try {
        const results = await getUserVSFast(address);
        if (!cancelled) {
          results.sort((a, b) => b.id - a.id);
          setDuels(results);
        }
      } catch (e) {
        console.error("[MessagesHub]", e);
        if (!cancelled) {
          setLoadError(true);
          setDuels([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const { eligible, other } = useMemo(() => {
    const el: VSData[] = [];
    const rest: VSData[] = [];
    for (const vs of duels) {
      if (!isSampleVsIdForXmtp(vs.id) && canOpenVsXmtpChat(vs)) {
        el.push(vs);
      } else {
        rest.push(vs);
      }
    }
    return { eligible: el, other: rest };
  }, [duels]);

  const participating = duels.length > 0;

  if (!featureOn) {
    return (
      <PageTransition>
        <div className={HUB_SHELL}>
          <AnimatedItem>
            <MessagesPageHero variant="featureOff" className="pt-2 sm:pt-4" />
          </AnimatedItem>
          <div className={CONTENT_DIVIDER}>
            <AnimatedItem>
              <GlassCard className="border border-white/[0.1]">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="rounded-lg border border-pv-muted/25 bg-pv-surface2 p-2.5 sm:p-3">
                    <Lock className="text-pv-muted" size={22} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-pv-text sm:text-sm sm:tracking-[0.18em]">
                      {t("featureOffTitle")}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-pv-muted sm:text-[15px]">
                      {t("featureOffDesc")}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </AnimatedItem>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!isConnected) {
    return (
      <MessagesWalletGate onConnect={connect} isConnecting={isConnecting} />
    );
  }

  return (
    <PageTransition>
      <div className={HUB_SHELL}>
        <AnimatedItem>
          <MessagesPageHero className="pt-2 sm:pt-4" />
        </AnimatedItem>

        <div className={CONTENT_DIVIDER}>
          {loading && (
            <ChannelListSkeleton ariaLabel={t("loadingAria")} />
          )}

          {!loading && loadError && (
            <AnimatedItem>
              <GlassCard className="border border-pv-danger/25 bg-pv-danger/[0.05]">
                <div className="flex gap-3 sm:gap-4">
                  <div className="shrink-0 pt-0.5">
                    <AlertCircle
                      className="text-pv-danger"
                      size={22}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-relaxed text-pv-danger">
                      {t("loadError")}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      fullWidth={false}
                      className="mt-4 !w-auto min-h-[44px] px-4 text-xs"
                      onClick={() => {
                        if (!address) return;
                        setLoading(true);
                        setLoadError(false);
                        void getUserVSFast(address)
                          .then((r) => {
                            r.sort((a, b) => b.id - a.id);
                            setDuels(r);
                          })
                          .catch(() => setLoadError(true))
                          .finally(() => setLoading(false));
                      }}
                    >
                      {t("retry")}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </AnimatedItem>
          )}

          {!loading && !loadError && !participating && (
            <AnimatedItem>
              <GlassCard className="relative overflow-hidden border border-white/[0.1]">
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-pv-emerald/[0.06] blur-2xl" />
                <div className="relative flex flex-col items-center px-4 py-10 text-center sm:px-6 sm:py-12">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-pv-emerald/20 bg-pv-emerald/[0.08] sm:h-16 sm:w-16">
                    <Radio
                      className="text-pv-emerald/90"
                      size={28}
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </div>
                  <h2 className="mt-5 font-display text-base font-bold uppercase tracking-[0.08em] text-pv-text sm:text-lg sm:tracking-tight">
                    {t("noParticipationTitle")}
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-pv-muted sm:text-[15px]">
                    {t("noParticipationDesc")}
                  </p>
                  <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link href="/explorer" className="w-full sm:w-auto">
                      <Button
                        variant="ghost"
                        fullWidth
                        className="min-h-[44px] sm:!w-auto sm:min-w-[10rem] sm:px-6"
                      >
                        {t("goExplore")}
                      </Button>
                    </Link>
                    <Link href="/vs/create" className="w-full sm:w-auto">
                      <Button
                        variant="primary"
                        fullWidth
                        className="min-h-[44px] sm:!w-auto sm:min-w-[10rem] sm:px-6"
                      >
                        {t("goChallenge")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </GlassCard>
            </AnimatedItem>
          )}

          {!loading && !loadError && participating && eligible.length === 0 && (
            <AnimatedItem>
              <GlassCard className="mb-6 border border-pv-emerald/[0.18] bg-pv-emerald/[0.04] sm:mb-8">
                <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-pv-text sm:text-sm">
                  {t("hubDisabledTitle")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-pv-muted sm:text-[15px]">
                  {t("hubDisabledDesc")}
                </p>
              </GlassCard>
            </AnimatedItem>
          )}

          {!loading && !loadError && participating && eligible.length > 0 && (
            <AnimatedItem>
              <section
                aria-labelledby="messages-active-heading"
                className="mb-10 sm:mb-12"
              >
                <h2
                  id="messages-active-heading"
                  className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-pv-emerald/90 sm:text-[11px] sm:tracking-[0.22em]"
                >
                  {t("sectionActive")}
                </h2>
                <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-pv-muted">
                  {t("sectionActiveHelp")}
                </p>
                <ul className="mt-4 space-y-3 sm:mt-5">
                  {eligible.map((vs, i) => {
                    const peer = getVsXmtpPeerAddress(vs, address);
                    const href = `/vs/${vs.id}#${VS_XMTP_CHAT_ANCHOR_ID}`;
                    const pot = getVSTotalPot(vs);
                    return (
                      <li key={vs.id}>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.35,
                            delay: i * 0.05,
                            ease: [0.25, 0.46, 0.45, 0.94],
                          }}
                          whileHover={{ y: -1 }}
                        >
                          <Link
                            href={href}
                            className="group block rounded-xl border border-pv-emerald/[0.22] bg-gradient-to-br from-pv-emerald/[0.07] to-transparent p-4 transition-colors hover:border-pv-emerald/40 hover:from-pv-emerald/[0.1] sm:p-5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-display text-sm font-bold leading-snug text-pv-text transition-colors group-hover:text-pv-emerald sm:text-[15px]">
                                  {truncateQuestion(vs.question)}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-pv-muted">
                                  {peer && (
                                    <span>vs {shortenAddress(peer)}</span>
                                  )}
                                  {pot > 0 && (
                                    <span className="text-pv-gold/80">
                                      {pot} GEN
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ArrowRight
                                className="mt-0.5 shrink-0 text-pv-emerald/70 transition-colors group-hover:text-pv-emerald"
                                size={18}
                                aria-hidden
                              />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded border border-pv-emerald/[0.28] bg-pv-emerald/[0.1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-pv-emerald">
                                <Zap size={8} aria-hidden />
                                {t("badgeLive")}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-wider text-pv-muted">
                                VS #{vs.id}
                              </span>
                            </div>
                          </Link>
                        </motion.div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </AnimatedItem>
          )}

          {!loading && !loadError && participating && other.length > 0 && (
            <AnimatedItem>
              <section
                aria-labelledby="messages-pending-heading"
                className={
                  eligible.length > 0
                    ? "mt-10 border-t border-white/[0.06] pt-10 sm:mt-12 sm:pt-12"
                    : ""
                }
              >
                <h2
                  id="messages-pending-heading"
                  className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-pv-muted sm:text-[11px] sm:tracking-[0.22em]"
                >
                  {t("sectionPending")}
                </h2>
                <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-pv-muted">
                  {t("sectionPendingHelp")}
                </p>
                <ul className="mt-4 space-y-3 sm:mt-5">
                  {other.map((vs, i) => {
                    const reason =
                      getVsXmtpUnavailableReason(vs) ?? "not_accepted";
                    const isWaiting = reason === "not_accepted";
                    const StateIcon = isWaiting ? Clock : Ban;
                    return (
                      <li key={vs.id}>
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.3,
                            delay: 0.08 + i * 0.04,
                            ease: [0.25, 0.46, 0.45, 0.94],
                          }}
                        >
                          <Link
                            href={`/vs/${vs.id}`}
                            aria-label={`${t("viewVs")} — VS ${vs.id}`}
                            className={`group block rounded-xl border bg-pv-surface2/35 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-[border-color,background-color,box-shadow] duration-200 ease-out sm:p-5 ${
                              isWaiting
                                ? "border-amber-400/15 hover:border-amber-400/28 hover:bg-amber-400/[0.04]"
                                : "border-white/[0.1] hover:border-white/[0.18] hover:bg-pv-surface2/50"
                            }`}
                          >
                            <div className="flex items-start gap-3 sm:gap-4">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border sm:h-11 sm:w-11 ${
                                  isWaiting
                                    ? "border-amber-400/25 bg-amber-400/[0.1] text-amber-200/85"
                                    : "border-white/[0.1] bg-white/[0.04] text-pv-muted"
                                }`}
                                aria-hidden
                              >
                                <StateIcon
                                  size={18}
                                  strokeWidth={1.75}
                                  className="opacity-90"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-display text-[13px] font-bold leading-snug text-pv-text transition-colors group-hover:text-pv-text sm:text-sm">
                                  {truncateQuestion(vs.question, 72)}
                                </p>
                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
                                      isWaiting
                                        ? "border-amber-400/30 bg-amber-400/[0.06] text-amber-200/95"
                                        : "border-white/[0.1] bg-white/[0.04] text-pv-muted"
                                    }`}
                                  >
                                    {isWaiting
                                      ? t("badgeAwaiting")
                                      : t("badgeNoComms")}
                                  </span>
                                  <span className="font-mono text-[10px] leading-snug text-pv-muted [overflow-wrap:anywhere]">
                                    {t(`reason.${reason}`)}
                                  </span>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
                                  <span className="font-mono text-[10px] font-medium tabular-nums text-pv-muted/85">
                                    VS #{vs.id}
                                  </span>
                                  <span className="inline-flex shrink-0 items-center gap-1 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted transition-colors group-hover:text-pv-emerald">
                                    {t("viewVs")}
                                    <ChevronRight
                                      size={14}
                                      strokeWidth={2.25}
                                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                                      aria-hidden
                                    />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </AnimatedItem>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
