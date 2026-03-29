"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import {
  didUserLoseVS,
  didUserWinVS,
  getUserVSDirect,
  getVSUserWinAmount,
  getVSTotalPot,
  isVSPrivate,
  type VSData,
} from "@/lib/contract";
import { ZERO_ADDRESS } from "@/lib/constants";
import { mergePendingVS } from "@/lib/pending-vs";
import {
  applyExploreFilters,
  DEFAULT_EXPLORE_FILTERS,
} from "@/lib/exploreFilters";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { Badge, VSStrip } from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import DashboardPortfolioSection from "@/components/dashboard/DashboardPortfolioSection";
import DashboardVSFilterBar from "@/components/dashboard/DashboardVSFilterBar";
import { Trophy, Flame, TrendingUp } from "lucide-react";

/** Alineado con píldoras de Explore (`ExploreClient`). */
const filterPillBase =
  "shrink-0 rounded border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-tight transition-[color,border-color,background-color] focus-ring min-h-[44px]";
const filterPillActive = "border-pv-emerald/50 bg-pv-emerald text-pv-bg";

const listItemEase = [0.25, 0.1, 0.25, 1] as const;

export default function DashboardPage() {
  const { address, isConnected, connect } = useWallet();
  const [duels, setDuels] = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "active" | "done">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(
    DEFAULT_EXPLORE_FILTERS.cat
  );
  const [minStakeFilter, setMinStakeFilter] = useState(
    DEFAULT_EXPLORE_FILTERS.minStake
  );
  const t = useTranslations("dashboard");

  useEffect(() => {
    async function load() {
      if (!address) {
        setLoading(false);
        return;
      }
      try {
        const results = await getUserVSDirect(address);
        results.sort((a, b) => b.id - a.id);
        setDuels(mergePendingVS(results, address));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address]);

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
      }),
    [tabFiltered, categoryFilter, minStakeFilter, searchQuery]
  );

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

  const hasActiveNarrowing =
    searchQuery.trim().length > 0 ||
    categoryFilter !== DEFAULT_EXPLORE_FILTERS.cat ||
    minStakeFilter !== DEFAULT_EXPLORE_FILTERS.minStake;

  const showFilterEmpty =
    tabFiltered.length > 0 && filtered.length === 0 && hasActiveNarrowing;

  const resetListFilters = () => {
    setSearchQuery("");
    setCategoryFilter(DEFAULT_EXPLORE_FILTERS.cat);
    setMinStakeFilter(DEFAULT_EXPLORE_FILTERS.minStake);
  };

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

  const statTiles = [
    {
      key: "record",
      icon: Trophy,
      iconClass: "text-pv-emerald",
      value: `${won}W – ${lost}L`,
      valueClass: "text-pv-emerald",
      label: t("record"),
    },
    {
      key: "winRate",
      icon: TrendingUp,
      iconClass: "text-pv-emerald",
      value: `${winRate}%`,
      valueClass: "text-pv-text",
      label: t("winRate"),
    },
    {
      key: "totalWon",
      icon: Flame,
      iconClass: "text-pv-gold",
      value: `${totalWon} GEN`,
      valueClass: "text-pv-gold",
      label: t("totalWon"),
    },
  ] as const;

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
          className="mb-10 mt-5 border-t border-white/[0.06] pt-8 sm:mt-6 sm:pt-10"
          aria-label={t("overviewSectionAria")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {(
              [
                {
                  key: "active",
                  titleKey: "overviewActiveTitle",
                  valueKey: "overviewActiveValue",
                  subKey: "overviewActiveSub",
                  subClass: "text-pv-emerald",
                },
                {
                  key: "bankroll",
                  titleKey: "overviewBankrollTitle",
                  valueKey: "overviewBankrollValue",
                  subKey: "overviewBankrollSub",
                  subClass: "text-pv-muted",
                },
                {
                  key: "net",
                  titleKey: "overviewNetTitle",
                  valueKey: "overviewNetValue",
                  subKey: "overviewNetSub",
                  subClass: "text-pv-muted",
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
                className="group relative flex min-h-[140px] flex-col overflow-hidden rounded-lg border border-white/[0.12] bg-pv-surface p-5 transition-[border-color,background-color] duration-300 hover:border-pv-emerald/28 hover:bg-[#242323] sm:min-h-[152px] sm:p-6"
              >
                <div
                  className="pointer-events-none absolute left-0 top-0 h-0 w-1 bg-pv-emerald transition-[height] duration-500 ease-out group-hover:h-full"
                  aria-hidden
                />
                <div className="relative z-10 flex min-h-0 flex-1 flex-col text-left">
                  <h2 className="font-display text-[10px] font-bold uppercase leading-snug tracking-[0.16em] text-pv-muted sm:text-[11px]">
                    {t(card.titleKey)}
                  </h2>
                  <p className="mt-3 font-mono text-3xl font-bold tabular-nums leading-none tracking-tight text-pv-text sm:text-4xl">
                    {t(card.valueKey)}
                  </p>
                  <p
                    className={`mt-auto pt-4 font-mono text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] sm:text-[11px] ${card.subClass}`}
                  >
                    {t(card.subKey)}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      </AnimatedItem>

      <AnimatedItem>
        <DashboardPortfolioSection
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
            />
          }
        />
      </AnimatedItem>

      {duels.length > 0 ? (
        <AnimatedItem>
          <section
            className="mb-6 overflow-hidden rounded-lg border border-white/[0.1] bg-pv-surface shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
            aria-label={t("statsSectionAria")}
          >
            <div className="grid grid-cols-3 divide-x divide-white/[0.08]">
              {statTiles.map((tile, i) => {
                const Icon = tile.icon;
                return (
                  <motion.div
                    key={tile.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: i * 0.06,
                      ease: listItemEase,
                    }}
                    className="group relative min-w-0 bg-pv-surface px-3 py-5 text-center sm:px-4 sm:py-6"
                  >
                    <div
                      className="pointer-events-none absolute left-0 top-0 h-0 w-1 bg-pv-emerald transition-[height] duration-500 ease-out group-hover:h-full"
                      aria-hidden
                    />
                    <Icon
                      size={16}
                      className={`inline-block ${tile.iconClass} mb-2 opacity-90`}
                      aria-hidden
                    />
                    <div
                      className={`font-mono text-base font-bold tabular-nums sm:text-lg ${tile.valueClass}`}
                    >
                      {tile.value}
                    </div>
                    <div className="mt-1 font-display text-[9px] font-bold uppercase tracking-[0.14em] text-pv-muted sm:text-[10px]">
                      {tile.label}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </AnimatedItem>
      ) : null}

      {loading ? null : filtered.length === 0 ? (
        showFilterEmpty ? (
          <EmptyState
            title={t("searchNoResultsTitle")}
            description={t("filterNoResultsDesc")}
            actionLabel={t("resetFiltersAction")}
            onAction={resetListFilters}
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
                    <article className="card relative flex h-full flex-col overflow-hidden border-white/[0.12] bg-pv-surface p-5 transition-[border-color,background-color] duration-300 hover:border-pv-emerald/30 hover:bg-[#242323] sm:p-6">
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
                            {isVSPrivate(vs) ? (
                              <span className="rounded border border-pv-gold/[0.25] bg-pv-gold/[0.08] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-pv-gold">
                                {t("privateBadge")}
                              </span>
                            ) : null}
                          </div>
                          <span className="font-mono text-[13px] font-bold text-pv-gold">
                            {getVSTotalPot(vs)} GEN
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
                          isOpen={vs.opponent === ZERO_ADDRESS}
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
