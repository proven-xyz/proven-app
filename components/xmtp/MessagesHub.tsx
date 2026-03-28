"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import { getUserVSDirect, type VSData } from "@/lib/contract";
import { shortenAddress } from "@/lib/constants";
import { isXmtpFeatureEnabled } from "@/lib/xmtp/config";
import {
  VS_XMTP_CHAT_ANCHOR_ID,
  canOpenVsXmtpChat,
  getVsXmtpPeerAddress,
  getVsXmtpUnavailableReason,
  isSampleVsIdForXmtp,
} from "@/lib/xmtp/vs-chat-eligibility";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import { Button, GlassCard, VSCardSkeleton } from "@/components/ui";
import { ArrowRight, MessageCircle, Radio, Lock } from "lucide-react";

function truncateQuestion(q: string, max = 72): string {
  const t = q.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export default function MessagesHub() {
  const { address, isConnected, connect } = useWallet();
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
        const results = await getUserVSDirect(address);
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
        <AnimatedItem>
          <GlassCard className="max-w-lg mx-auto mt-8 border border-white/[0.1]">
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-pv-muted/25 bg-pv-surface2 p-2.5">
                <Lock className="text-pv-muted" size={22} aria-hidden />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold text-pv-text">
                  {t("featureOffTitle")}
                </h1>
                <p className="text-sm text-pv-muted mt-2 leading-relaxed">
                  {t("featureOffDesc")}
                </p>
              </div>
            </div>
          </GlassCard>
        </AnimatedItem>
      </PageTransition>
    );
  }

  if (!isConnected) {
    return (
      <PageTransition>
        <EmptyState
          title={t("connectTitle")}
          description={t("connectDesc")}
          actionLabel={t("connect")}
          onAction={connect}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-[720px] mx-auto px-4 sm:px-0 pb-16">
        <AnimatedItem>
          <header className="mb-8 pt-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald/80 mb-2">
              {t("eyebrow")}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="font-display text-[clamp(1.5rem,4vw,2rem)] font-bold tracking-tight flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-pv-emerald/25 bg-pv-emerald/[0.08]">
                    <MessageCircle
                      className="text-pv-emerald"
                      size={20}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                  {t("title")}
                </h1>
                <p className="font-mono text-xs text-pv-muted mt-2 tracking-wide max-w-md">
                  {t("subtitle")}
                </p>
              </div>
            </div>
          </header>
        </AnimatedItem>

        {loading && (
          <div className="space-y-3">
            <VSCardSkeleton />
            <VSCardSkeleton />
          </div>
        )}

        {!loading && loadError && (
          <AnimatedItem>
            <GlassCard className="border border-pv-danger/20 bg-pv-danger/[0.04]">
              <p className="text-sm text-pv-danger font-medium">{t("loadError")}</p>
              <Button
                type="button"
                variant="ghost"
                fullWidth={false}
                className="mt-3 !w-auto text-xs"
                onClick={() => {
                  if (!address) return;
                  setLoading(true);
                  setLoadError(false);
                  void getUserVSDirect(address)
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
            </GlassCard>
          </AnimatedItem>
        )}

        {!loading && !loadError && !participating && (
          <AnimatedItem>
            <GlassCard className="relative overflow-hidden border border-white/[0.08]">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-pv-emerald/[0.06] blur-2xl pointer-events-none" />
              <div className="relative flex flex-col items-center text-center py-10 px-4">
                <Radio
                  className="text-pv-muted mb-4 opacity-80"
                  size={36}
                  strokeWidth={1.25}
                  aria-hidden
                />
                <h2 className="font-display text-lg font-bold text-pv-text mb-2">
                  {t("noParticipationTitle")}
                </h2>
                <p className="text-sm text-pv-muted max-w-sm mb-6 leading-relaxed">
                  {t("noParticipationDesc")}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Link href="/explorer">
                    <Button variant="ghost" fullWidth={false} className="!w-auto px-5">
                      {t("goExplore")}
                    </Button>
                  </Link>
                  <Link href="/vs/create">
                    <Button variant="primary" fullWidth={false} className="!w-auto px-5">
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
            <GlassCard className="mb-6 border border-pv-emerald/[0.15] bg-pv-emerald/[0.03]">
              <p className="text-sm text-pv-text font-medium">{t("hubDisabledTitle")}</p>
              <p className="text-xs text-pv-muted mt-2 leading-relaxed">
                {t("hubDisabledDesc")}
              </p>
            </GlassCard>
          </AnimatedItem>
        )}

        {!loading && !loadError && participating && eligible.length > 0 && (
          <AnimatedItem>
            <section aria-labelledby="messages-active-heading" className="mb-10">
              <h2
                id="messages-active-heading"
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-pv-emerald/90 mb-3"
              >
                {t("sectionActive")}
              </h2>
              <ul className="space-y-3">
                {eligible.map((vs) => {
                  const peer = getVsXmtpPeerAddress(vs, address);
                  const href = `/vs/${vs.id}#${VS_XMTP_CHAT_ANCHOR_ID}`;
                  return (
                    <li key={vs.id}>
                      <motion.div
                        whileHover={{ y: -1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      >
                        <Link
                          href={href}
                          className="group block rounded-xl border border-pv-emerald/[0.22] bg-gradient-to-br from-pv-emerald/[0.07] to-transparent p-4 transition-colors hover:border-pv-emerald/40 hover:from-pv-emerald/[0.1]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-display text-sm font-bold text-pv-text leading-snug group-hover:text-pv-emerald transition-colors">
                                {truncateQuestion(vs.question)}
                              </p>
                              {peer ? (
                                <p className="text-[11px] text-pv-muted mt-2 font-mono">
                                  {t("withPeer", {
                                    address: shortenAddress(peer),
                                  })}
                                </p>
                              ) : null}
                            </div>
                            <ArrowRight
                              className="shrink-0 text-pv-emerald/70 group-hover:text-pv-emerald transition-colors mt-0.5"
                              size={18}
                              aria-hidden
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded border border-pv-emerald/[0.28] bg-pv-emerald/[0.1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-pv-emerald">
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-pv-emerald"
                                aria-hidden
                              />
                              {t("badgeLive")}
                            </span>
                            <span className="text-[10px] text-pv-muted uppercase tracking-wider font-mono">
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
            <section aria-labelledby="messages-pending-heading">
              <h2
                id="messages-pending-heading"
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-pv-muted mb-3"
              >
                {t("sectionPending")}
              </h2>
              <ul className="space-y-2">
                {other.map((vs) => {
                  const reason =
                    getVsXmtpUnavailableReason(vs) ?? "not_accepted";
                  return (
                    <li key={vs.id}>
                      <GlassCard className="!p-3 border border-white/[0.06] opacity-[0.92]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-pv-text/90 leading-snug">
                              {truncateQuestion(vs.question, 64)}
                            </p>
                            <p className="text-[10px] text-pv-muted mt-1.5">
                              {t(`reason.${reason}`)}
                            </p>
                          </div>
                          <Link
                            href={`/vs/${vs.id}`}
                            className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-pv-emerald hover:underline"
                          >
                            {t("viewVs")}
                          </Link>
                        </div>
                      </GlassCard>
                    </li>
                  );
                })}
              </ul>
            </section>
          </AnimatedItem>
        )}
      </div>
    </PageTransition>
  );
}
