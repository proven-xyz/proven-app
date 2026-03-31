"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import {
  getUserVSFast,
  didUserLoseVS,
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
import DashboardPortfolioSection from "@/components/dashboard/DashboardPortfolioSection";
import DashboardWalletGate from "@/components/dashboard/DashboardWalletGate";
import DashboardVSFilterBar from "@/components/dashboard/DashboardVSFilterBar";

/** Alineado con píldoras de Explore (`ExploreClient`). */
const filterPillBase =
  "shrink-0 rounded border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-tight transition-[color,border-color,background-color] focus-ring min-h-[44px]";
const filterPillActive = "border-pv-emerald/50 bg-pv-emerald text-pv-bg";

const listItemEase = [0.25, 0.1, 0.25, 1] as const;

export default function DashboardPage() {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const [duels, setDuels] = useState<VSData[]>([]);
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
        return;
      }
      try {
        const results = await getUserVSFast(address);
        results.sort((a, b) => b.id - a.id);
        setDuels(mergePendingVS(results, address));
      } catch (e) {
        console.error(e);
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
        needsChallengers: false,
        expiringSoon: false,
      }),
    [tabFiltered, categoryFilter, minStakeFilter, searchQuery]
  );

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

  const featuredVS =
    filtered.find((vs) => vs.state === "open" || vs.state === "accepted") ??
    null;

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
          className="mb-10 mt-5 pt-8 sm:mt-6 sm:pt-10"
          aria-label={t("overviewSectionAria")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
            {(
              [
                {
                  key: "wins",
                  title: "CHALLENGES WON",
                  value: `${won}`,
                  sub: t("record"),
                  valueClass: "text-pv-emerald",
                  subClass: "text-pv-emerald",
                },
                {
                  key: "lose",
                  title: "CHALLENGES LOSSES",
                  value: `${lost}`,
                  sub: t("record"),
                  valueClass: "text-pv-danger",
                  subClass: "text-pv-danger",
                },
                {
                  key: "winRate",
                  title: t("winRate"),
                  value: `${winRate}%`,
                  sub: t("winRate"),
                  valueClass: "text-pv-emerald",
                  subClass: "text-pv-emerald",
                },
                {
                  key: "won",
                  title: "TOTAL CLAIMED",
                  value: `${totalWon} GEN`,
                  sub: t("totalWon"),
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
                className="group relative flex min-h-[140px] flex-col overflow-hidden rounded-lg border border-white/[0.12] bg-pv-surface p-5 transition-[border-color,background-color] duration-300 hover:border-pv-emerald/28 hover:bg-[#242323] sm:min-h-[152px] sm:p-6"
              >
                <div
                  className="pointer-events-none absolute left-0 top-0 h-0 w-1 bg-pv-emerald transition-[height] duration-500 ease-out group-hover:h-full"
                  aria-hidden
                />
                <div className="relative z-10 flex min-h-0 flex-1 flex-col text-left">
                  <h2 className="font-display text-[10px] font-bold uppercase leading-snug tracking-[0.16em] text-pv-muted sm:text-[11px]">
                    {card.title}
                  </h2>
                  <p
                    className={`mt-3 font-mono text-3xl font-bold tabular-nums leading-none tracking-tight text-pv-text sm:text-4xl ${card.valueClass}`}
                  >
                    {card.value}
                  </p>
                  <p
                    className={`mt-auto pt-4 font-mono text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] sm:text-[11px] ${card.subClass}`}
                  >
                    {card.sub}
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
          featuredVS={featuredVS}
        />
      </AnimatedItem>
    </PageTransition>
  );
}
