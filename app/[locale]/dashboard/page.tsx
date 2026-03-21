"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import { getUserVSList, getVS } from "@/lib/contract";
import type { VSData } from "@/lib/contract";
import { ZERO_ADDRESS, shortenAddress } from "@/lib/constants";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import {
  GlassCard,
  Badge,
  Button,
  Chip,
  VSStrip,
  VSCardSkeleton,
} from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import { Trophy, Flame, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { address, isConnected, connect } = useWallet();
  const [duels, setDuels]     = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"all" | "active" | "done">("all");
  const t = useTranslations("dashboard");

  useEffect(() => {
    async function load() {
      if (!address) {
        setLoading(false);
        return;
      }
      try {
        const ids     = await getUserVSList(address);
        const results = await Promise.all(ids.map((id) => getVS(id)));
        const valid   = results.filter((v): v is VSData => v !== null);
        valid.sort((a, b) => b.id - a.id);
        setDuels(valid);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address]);

  if (!isConnected) {
    return (
      <EmptyState
        title={t("connectTitle")}
        description={t("connectDesc")}
        actionLabel={t("connect")}
        onAction={connect}
      />
    );
  }

  const filtered =
    tab === "all"
      ? duels
      : tab === "active"
      ? duels.filter((d) => d.state === "open" || d.state === "accepted")
      : duels.filter((d) => d.state === "resolved" || d.state === "cancelled");

  const won = duels.filter(
    (d) =>
      d.state === "resolved" &&
      d.winner.toLowerCase() === address!.toLowerCase()
  ).length;
  const lost = duels.filter(
    (d) =>
      d.state === "resolved" &&
      d.winner !== ZERO_ADDRESS &&
      d.winner.toLowerCase() !== address!.toLowerCase()
  ).length;
  const totalWon = duels
    .filter(
      (d) =>
        d.state === "resolved" &&
        d.winner.toLowerCase() === address!.toLowerCase()
    )
    .reduce((s, d) => s + d.stake_amount * 2, 0);
  const winRate =
    won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  const tabs = [
    { l: t("tabAll"),    v: "all"    as const, count: duels.length },
    {
      l: t("tabActive"),
      v: "active" as const,
      count: duels.filter(
        (d) => d.state === "open" || d.state === "accepted"
      ).length,
    },
    {
      l: t("tabDone"),
      v: "done" as const,
      count: duels.filter(
        (d) => d.state === "resolved" || d.state === "cancelled"
      ).length,
    },
  ];

  return (
    <PageTransition>
      <AnimatedItem>
        <div className="flex items-start justify-between mb-6 gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald/80 mb-2">
              {t("eyebrow")}
            </div>
            <h1 className="font-display text-[clamp(1.5rem,5vw,2.25rem)] font-bold tracking-tight leading-none">
              {t("title")}
            </h1>
            <p className="font-mono text-xs text-pv-muted mt-2 tracking-wide">
              {t("total", { count: duels.length })}
            </p>
          </div>
          <Link href="/vs/create" className="flex-shrink-0 mt-1">
            <Chip className="text-pv-cyan border-pv-cyan/[0.25] bg-pv-cyan/[0.06] text-[13px] font-bold">
              {t("new")}
            </Chip>
          </Link>
        </div>
      </AnimatedItem>

      {/* Stats bar */}
      {duels.length > 0 && (
        <AnimatedItem>
          <div className="grid grid-cols-3 gap-2.5 lg:gap-4 mb-6">
            <GlassCard glow="emerald" noPad>
              <div className="p-4 text-center">
                <Trophy size={16} className="text-pv-emerald mx-auto mb-1.5" />
                <div className="font-mono text-lg font-bold text-pv-emerald">
                  {won}W – {lost}L
                </div>
                <div className="text-[10px] text-pv-muted font-bold uppercase tracking-wider mt-0.5">
                  {t("record")}
                </div>
              </div>
            </GlassCard>
            <GlassCard noPad>
              <div className="p-4 text-center">
                <TrendingUp size={16} className="text-pv-cyan mx-auto mb-1.5" />
                <div className="font-mono text-lg font-bold text-pv-text">
                  {winRate}%
                </div>
                <div className="text-[10px] text-pv-muted font-bold uppercase tracking-wider mt-0.5">
                  {t("winRate")}
                </div>
              </div>
            </GlassCard>
            <GlassCard noPad>
              <div className="p-4 text-center">
                <Flame size={16} className="text-pv-gold mx-auto mb-1.5" />
                <div className="font-mono text-lg font-bold text-pv-gold">
                  ${totalWon}
                </div>
                <div className="text-[10px] text-pv-muted font-bold uppercase tracking-wider mt-0.5">
                  {t("totalWon")}
                </div>
              </div>
            </GlassCard>
          </div>
        </AnimatedItem>
      )}

      {/* Tabs */}
      <AnimatedItem>
        <div className="flex gap-2 mb-6 relative">
          {tabs.map(({ l, v, count }) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`chip text-sm relative ${
                tab === v
                  ? "bg-pv-text/[0.07] text-pv-text border-white/[0.22]"
                  : "text-pv-muted hover:text-pv-text hover:border-white/[0.22]"
              }`}
            >
              {l}
              {count > 0 && (
                <span className="ml-1.5 text-[10px] opacity-50">{count}</span>
              )}
              {tab === v && (
                <motion.div
                  layoutId="dashboard-tab"
                  className="absolute -bottom-px left-2 right-2 h-0.5 bg-pv-text rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </AnimatedItem>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <VSCardSkeleton />
          <VSCardSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("noVSHere")}
          description={t("noVSDesc")}
          actionLabel={t("challengeSomeone")}
          actionHref="/vs/create"
        />
      ) : (
        <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {filtered.map((vs) => {
            const iWon =
              vs.state === "resolved" &&
              vs.winner.toLowerCase() === address!.toLowerCase();
            const iLost =
              vs.state === "resolved" &&
              vs.winner !== ZERO_ADDRESS &&
              vs.winner.toLowerCase() !== address!.toLowerCase();
            const st = iWon ? "won" : iLost ? "lost" : vs.state;

            return (
              <motion.div
                key={vs.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Link href={`/vs/${vs.id}`} className="block group">
                  <div className="card card-hover p-5 cursor-pointer">
                    <div className="flex justify-between items-center mb-3">
                      <Badge status={st} />
                      <span className="font-mono text-[13px] font-bold text-pv-gold">
                        $
                        {vs.stake_amount *
                          (vs.opponent === ZERO_ADDRESS ? 1 : 2)}
                      </span>
                    </div>
                    <div className="font-display text-[17px] font-bold leading-snug mb-3 tracking-tight">
                      {vs.question}
                    </div>
                    <VSStrip
                      creator={vs.creator}
                      creatorPosition={vs.creator_position}
                      opponent={vs.opponent}
                      opponentPosition={vs.opponent_position}
                      isOpen={vs.opponent === ZERO_ADDRESS}
                      compact
                    />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </PageTransition>
  );
}
