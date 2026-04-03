"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import {
  getUserVSFast,
  didUserLoseVS,
  getUserVSSnapshot,
  didUserWinVS,
  getVSUserWinAmount,
  type VSData,
} from "@/lib/contract";
import { mergePendingVS } from "@/lib/pending-vs";
import {
  applyExploreFilters,
  DEFAULT_EXPLORE_FILTERS,
} from "@/lib/exploreFilters";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { Badge, VSStrip, LiveStat } from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import DashboardPortfolioSection, {
  RiskAllocationProfileCard,
} from "@/components/dashboard/DashboardPortfolioSection";
import DashboardWalletGate from "@/components/dashboard/DashboardWalletGate";
import DashboardVSFilterBar from "@/components/dashboard/DashboardVSFilterBar";
import { Trophy, Flame, TrendingUp, Zap } from "lucide-react";

/** Alineado con píldoras de Explore (`ExploreClient`). */
const filterPillBase =
  "shrink-0 rounded border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-tight transition-[color,border-color,background-color] focus-ring min-h-[44px]";
const filterPillActive = "border-pv-emerald/50 bg-pv-emerald text-pv-bg";

const listItemEase = [0.25, 0.1, 0.25, 1] as const;

export default function DashboardPage() {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const [duels, setDuels] = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"all" | "active" | "done">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(
    DEFAULT_EXPLORE_FILTERS.cat
  );
  const [minStakeFilter, setMinStakeFilter] = useState(
    DEFAULT_EXPLORE_FILTERS.minStake
  );
  const requestIdRef = useRef(0);
  const t = useTranslations("dashboard");

  const loadDuels = useCallback(
    async ({
      forceRefresh = false,
      showPageLoading = false,
    }: {
      forceRefresh?: boolean;
      showPageLoading?: boolean;
    } = {}) => {
      const requestId = ++requestIdRef.current;

      if (!address) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showPageLoading) {
        setLoading(true);
      }
      if (forceRefresh) {
        setRefreshing(true);
      }

      try {
        const results = await getUserVSSnapshot(address, { forceRefresh });
        results.items.sort((a, b) => b.id - a.id);
        if (requestId === requestIdRef.current) {
          setDuels(mergePendingVS(results.items, address));
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [address]
  );

  useEffect(() => {
    void loadDuels({ showPageLoading: true });
  }, [loadDuels]);

  /** Debe ejecutarse en todo render (incluso si !isConnected): no condicionar hooks tras un return. */
  const tabFiltered = useMemo(() => {
    if (tab === "all") return duels;
    if (tab === "active") {
      return duels.filter(
        (d) => d.state === "open" || d.state === "accepted"
      );
    }
    return duels.filter(
      (d) => d.state === "resolved" || d.state === "cancelled"
    );
  }, [tab, duels]);

  const filtered = useMemo(
    () =>
      applyExploreFilters(tabFiltered, {
        cat: categoryFilter,
        minStake: minStakeFilter,
        sort: "newest",
        search: searchQuery,
        needsChallengers: false,
        expiringSoon: false,
      }),
    [tabFiltered, categoryFilter, minStakeFilter, searchQuery]
  );

  const featuredVS =
    filtered.find((vs) => vs.state === "open" || vs.state === "accepted") ??
    null;

  if (!isConnected) {
    return (
      <DashboardWalletGate onConnect={connect} isConnecting={isConnecting} />
    );
  }

  const won = duels.filter(
    (d) => d.state === "resolved" && didUserWinVS(d, address)
  ).length;
  const lost = duels.filter(
    (d) => d.state === "resolved" && didUserLoseVS(d, address)
  ).length;
  const totalWon = duels
    .filter((d) => d.state === "resolved" && didUserWinVS(d, address))
    .reduce((sum, duel) => sum + (getVSUserWinAmount(duel, address) ?? 0), 0);
  const winRate =
    won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  const tabs = [
    { l: t("tabAll"), v: "all" as const, count: duels.length },
    {
      l: t("tabActive"),
      v: "active" as const,
      count: duels.filter((d) => d.state === "open" || d.state === "accepted")
        .length,
    },
    {
      l: t("tabDone"),
      v: "done" as const,
      count: duels.filter(
        (d) => d.state === "resolved" || d.state === "cancelled"
      ).length,
    },
  ];

  /* ── Streak calculation ── */
  const recentResolved = duels
    .filter((d) => d.state === "resolved")
    .slice(0, 20);
  let streakType: "W" | "L" | null = null;
  let streakCount = 0;
  for (const d of recentResolved) {
    const w = didUserWinVS(d, address);
    const l = didUserLoseVS(d, address);
    const curr = w ? "W" : l ? "L" : null;
    if (!curr) continue;
    if (streakType === null) {
      streakType = curr;
      streakCount = 1;
    } else if (curr === streakType) {
      streakCount++;
    } else {
      break;
    }
  }
  const streakLabel = streakCount >= 2 ? `${streakCount}${streakType}` : null;

  return (
    <PageTransition>
      <AnimatedItem>
        <header>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-4 sm:gap-6">
            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
              <h1 className="font-display text-2xl font-bold uppercase tracking-tighter text-pv-text sm:text-3xl md:text-4xl">
                {t("title")}
              </h1>
              <div
                className="h-px min-w-[2rem] flex-1 bg-white/[0.12]"
                aria-hidden
              />
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-3 sm:gap-4">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-1.5 w-1.5 rounded-full bg-pv-emerald shadow-[0_0_8px_rgba(78,222,163,0.6)]"
                  aria-hidden
                />
                <span className="font-mono text-xs text-pv-muted">
                  {t("total", { count: duels.length })}
                </span>
              </div>
              <Link
                href="/vs/create"
                className={`inline-flex items-center justify-center no-underline ${filterPillBase} ${filterPillActive}`}
              >
                {t("new")}
              </Link>
            </div>
          </div>
          <span className="block max-w-2xl font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-pv-emerald sm:text-xs">
            {t("eyebrow")}
          </span>
        </header>

        <section
          className={`mb-10 mt-5 border-t border-white/[0.06] pt-8 sm:mt-6 sm:pt-10 ${loading ? "opacity-70" : ""}`}
          aria-label={t("overviewSectionAria")}
          aria-busy={loading}
        >
          <div className="grid grid-cols-2 items-start gap-3 sm:gap-4 lg:grid-cols-4">
            {(
              [
                {
                  key: "wins",
                  titleKey: "overviewWinsTitle" as const,
                  value: loading ? "—" : String(won),
                  sub: "",
                  valueClass: "text-pv-emerald",
                  subClass: "text-pv-emerald",
                },
                {
                  key: "losses",
                  titleKey: "overviewLossesTitle" as const,
                  value: loading ? "—" : String(lost),
                  sub: "",
                  valueClass: "text-pv-danger",
                  subClass: "text-pv-danger",
                },
                {
                  key: "winRate",
                  titleKey: "overviewWinRateTitle" as const,
                  value: loading ? "—" : `${winRate}%`,
                  sub: "",
                  valueClass: "text-pv-emerald",
                  subClass: "text-pv-emerald",
                },
                {
                  key: "claimed",
                  titleKey: "overviewTotalClaimedTitle" as const,
                  value: loading ? "—" : `${totalWon} GEN`,
                  sub: "",
                  valueClass: "text-pv-gold",
                  subClass: "text-pv-gold",
                },
              ] as const
            ).map((card, i) => (
              <motion.article
                key={card.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.38,
                  delay: 0.08 + i * 0.07,
                  ease: listItemEase,
                }}
                className="group/col relative flex flex-col overflow-hidden rounded-lg border border-white/[0.12] bg-pv-surface p-5 transition-[border-color,background-color] duration-300 hover:border-pv-emerald/28 hover:bg-[#242323] sm:p-6"
              >
                <div
                  className="pointer-events-none absolute left-0 top-0 h-0 w-1 bg-pv-emerald transition-[height] duration-500 ease-out group-hover/col:h-full"
                  aria-hidden
                />
                <div className="relative z-10 flex flex-col text-left">
                  <h2 className="font-display text-[10px] font-bold uppercase leading-snug tracking-[0.16em] text-pv-muted sm:text-[11px]">
                    {t(card.titleKey as never)}
                    {card.key === "wins" ? (
                      <span className="invisible sm:hidden" aria-hidden>
                        {" "}
                        LOSSES
                      </span>
                    ) : null}
                  </h2>
                  <p
                    className={`mt-3 font-mono text-3xl font-bold tabular-nums leading-none tracking-tight sm:text-4xl ${card.valueClass}`}
                  >
                    {card.value}
                  </p>
                  {card.sub ? (
                    <p
                      className={`mt-auto pt-4 font-mono text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] sm:text-[11px] ${card.subClass}`}
                    >
                      {card.sub}
                    </p>
                  ) : null}
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <div className="mt-2 mb-8 lg:hidden">
          <RiskAllocationProfileCard wins={won} losses={lost} />
        </div>
      </AnimatedItem>

      <AnimatedItem>
        <DashboardPortfolioSection
          featuredVS={featuredVS}
          wins={won}
          losses={lost}
          stakeHoldingsSearchQuery={searchQuery}
          stakeHoldingsHeaderExtra={
            <DashboardVSFilterBar
              tab={tab}
              onTabChange={setTab}
              tabs={tabs}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              minStakeFilter={minStakeFilter}
              onMinStakeFilterChange={setMinStakeFilter}
              refreshing={refreshing}
              onRefresh={() => {
                void loadDuels({ forceRefresh: true });
              }}
            />
          }
        />
      </AnimatedItem>

      {duels.length > 0 ? (
        <AnimatedItem>
          <section
            className="mb-6 overflow-hidden rounded-2xl border border-white/[0.1] bg-pv-surface/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
            aria-label={t("statsSectionAria")}
          >
            <div className="grid grid-cols-3 divide-x divide-white/[0.08]">
              {/* Record (W-L) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0, ease: listItemEase }}
                className="group relative min-w-0 px-3 py-5 text-center sm:px-4 sm:py-6"
              >
                <div className="pointer-events-none absolute left-0 top-0 h-0 w-1 bg-pv-emerald transition-[height] duration-500 ease-out group-hover:h-full" aria-hidden />
                <Trophy size={16} className="inline-block text-pv-emerald mb-2 opacity-90" aria-hidden />
                <div className="flex items-center justify-center gap-2">
                  <div className="font-mono text-base font-bold tabular-nums text-pv-emerald sm:text-lg">
                    {won}<span className="text-pv-muted/60">W</span>
                    {" – "}
                    {lost}<span className="text-pv-muted/60">L</span>
                  </div>
                  {streakLabel && (
                    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                      streakType === "W"
                        ? "border border-pv-emerald/30 bg-pv-emerald/10 text-pv-emerald"
                        : "border border-red-400/30 bg-red-400/10 text-red-400"
                    }`}>
                      <Zap size={8} />
                      {streakLabel}
                    </span>
                  )}
                </div>
                <div className="mt-1 font-display text-[9px] font-bold uppercase tracking-[0.14em] text-pv-muted sm:text-[10px]">
                  {t("record")}
                </div>
              </motion.div>

              {/* Win Rate */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.06, ease: listItemEase }}
                className="group relative min-w-0 px-3 py-5 text-center sm:px-4 sm:py-6"
              >
                <div className="pointer-events-none absolute left-0 top-0 h-0 w-1 bg-pv-emerald transition-[height] duration-500 ease-out group-hover:h-full" aria-hidden />
                <TrendingUp size={16} className="inline-block text-pv-emerald mb-2 opacity-90" aria-hidden />
                <LiveStat value={winRate} suffix="%" size="sm" color="text" label={t("winRate")} labelPosition="below" className="items-center" />
              </motion.div>

              {/* Total Winnings */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12, ease: listItemEase }}
                className="group relative min-w-0 px-3 py-5 text-center sm:px-4 sm:py-6"
              >
                <div className="pointer-events-none absolute left-0 top-0 h-0 w-1 bg-pv-emerald transition-[height] duration-500 ease-out group-hover:h-full" aria-hidden />
                <Flame size={16} className="inline-block text-pv-gold mb-2 opacity-90" aria-hidden />
                <LiveStat value={totalWon} suffix=" GEN" size="sm" color="gold" label={t("totalWon")} labelPosition="below" className="items-center" />
              </motion.div>
            </div>
          </section>
        </AnimatedItem>
      ) : null}

      {loading ? null : filtered.length === 0 ? (
        true ? (
          <EmptyState
            title={t("searchNoResultsTitle")}
            description={t("filterNoResultsDesc")}
            actionLabel={t("resetFiltersAction")}
            onAction={() => { console.log("resetFiltersAction"); }}
          />
        ) : null
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={tab}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: listItemEase }}
            className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:gap-3"
          >
            {filtered.map((vs, i) => {
              const iWon = vs.state === "resolved" && didUserWinVS(vs, address);
              const iLost =
                vs.state === "resolved" && didUserLoseVS(vs, address);
              const st = iWon ? "won" : iLost ? "lost" : vs.state;

              return (
                <motion.div
                  key={vs.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{
                    duration: 0.24,
                    delay: Math.min(i, 8) * 0.04,
                    ease: listItemEase,
                  }}
                >
                  <Link href={`/vs/${vs.id}`} className="group block h-full">
                    <article className="card relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.12] bg-pv-surface/80 p-5 transition-[border-color,background-color] duration-300 hover:border-pv-emerald/30 hover:bg-[#242323] sm:p-6">
                      <div
                        className="pointer-events-none absolute left-0 top-0 h-0 w-1 bg-pv-emerald transition-[height] duration-500 ease-out group-hover:h-full"
                        aria-hidden
                      />
                      <div className="relative z-10 flex flex-1 flex-col">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {"pending" in vs && (vs as { pending?: boolean }).pending ? (
                              <span className="rounded border border-pv-cyan/[0.25] bg-pv-cyan/[0.08] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-pv-cyan animate-pulse">
                                {t("pendingSync")}
                              </span>
                            ) : (
                              <Badge status={st} />
                            )}
                            {true ? (
                              <span className="rounded border border-pv-gold/[0.25] bg-pv-gold/[0.08] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-pv-gold">
                                {t("privateBadge")}
                              </span>
                            ) : null}
                          </div>
                          <span className="font-mono text-[13px] font-bold text-pv-gold">
                            {100} GEN
                          </span>
                        </div>
                        <h2 className="mb-3 line-clamp-2 font-display text-[17px] font-bold uppercase leading-snug tracking-tight text-pv-text sm:text-lg">
                          {vs.question}
                        </h2>
                        <VSStrip
                          creator={vs.creator}
                          creatorPosition={vs.creator_position}
                          opponent={vs.opponent}
                          opponentPosition={vs.opponent_position}
                          isOpen={false}
                          compact
                        />
                      </div>
                    </article>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </PageTransition>
  );
}
