"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import {
  getAllVSSnapshot,
  getVSChallengerCount,
  isVSJoinable,
  type VSData,
  type VSFeedSnapshot,
} from "@/lib/contract";
import { mergePendingVS } from "@/lib/pending-vs";
import {
  applyExploreFilters,
  DEFAULT_EXPLORE_FILTERS,
  MIN_STAKE_OPTIONS,
  normalizeExploreMinStake,
  serializeExploreFilters,
  type ExploreSort,
} from "@/lib/exploreFilters";
import type { ChallengeOpportunitiesResponse, ChallengeOpportunity } from "@/lib/claimDrafts";
import { EXPLORE_PRIMARY_CATEGORY_ROW } from "@/lib/explorePrimaryCategories";
import { useExploreFilterState } from "@/hooks/useExploreFilterState";
import { getExploreSampleCards } from "@/lib/sampleVs";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { Button, ArenaCardSkeleton } from "@/components/ui";
import ArenaCard from "@/components/ArenaCard";
import EmptyState from "@/components/EmptyState";
import { ChevronDown, ListFilter, Search, X } from "lucide-react";
import ExploreFeaturedCarousel from "@/components/explorer/ExploreFeaturedCarousel";
import ChallengeOpportunityCard from "@/components/explorer/ChallengeOpportunityCard";
import Stage from "@/components/Stage";
import CacheFreshnessControls from "@/components/CacheFreshnessControls";
import type { VSCacheFreshness } from "@/lib/vs-freshness";

/** Píldoras de filtro (CATEGORIES + Quick minimum): borde tipo botón, mismo hover. */
const filterPillBase =
  "shrink-0 rounded border px-4 py-2 font-display text-xs font-bold uppercase tracking-tight transition-[color,border-color,background-color] focus-ring";
const filterPillActive = "border-pv-emerald/50 bg-pv-emerald text-pv-bg";
const filterPillInactive =
  "border-white/[0.15] bg-transparent text-pv-muted hover:border-white/[0.28] hover:text-pv-text";

export default function ExploreClient() {
  const { filters, updateFilters, resetFilters } = useExploreFilterState();
  const { address, isConnected } = useWallet();
  const locale = useLocale();
  const [allVS, setAllVS] = useState<VSData[]>([]);
  const [opportunities, setOpportunities] = useState<ChallengeOpportunity[]>([]);
  const [vsFreshness, setVsFreshness] = useState<VSCacheFreshness | null>(null);
  const [loading, setLoading] = useState(true);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [quickFilterMenuOpen, setQuickFilterMenuOpen] = useState(false);
  const [minDraft, setMinDraft] = useState("");
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const quickFilterMenuRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const opportunitiesEnabled =
    process.env.NEXT_PUBLIC_FEATURE_SOURCE_DRAFTS === "1";

  const t = useTranslations("explore");
  const tCat = useTranslations("categories");

  const loadExploreData = useCallback(
    async ({
      forceRefresh = false,
      showPageLoading = false,
    }: {
      forceRefresh?: boolean;
      showPageLoading?: boolean;
    } = {}) => {
      const requestId = ++requestIdRef.current;

      if (showPageLoading) {
        setLoading(true);
      }
      if (forceRefresh) {
        setRefreshing(true);
      }

      const vsPromise = getAllVSSnapshot({ forceRefresh })
        .then((results: VSFeedSnapshot) => {
          if (requestId === requestIdRef.current) {
            setAllVS(mergePendingVS(results.items));
            setVsFreshness(results.cache);
          }
        })
        .catch((error) => {
          console.error(error);
          if (requestId === requestIdRef.current && !forceRefresh) {
            setAllVS([]);
            setVsFreshness(null);
          }
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            setLoading(false);
          }
        });

      let opportunitiesPromise: Promise<void> = Promise.resolve();

      if (!opportunitiesEnabled) {
        setOpportunities([]);
        setOpportunitiesLoading(false);
      } else {
        setOpportunitiesLoading(true);
        opportunitiesPromise = fetch(`/api/challenge-opportunities?locale=${locale}&limit=6`, {
          cache: "no-store",
        })
          .then(async (response) => {
            const payload = (await response.json().catch(() => null)) as
              | ChallengeOpportunitiesResponse
              | { error?: { message?: string } }
              | null;

            if (!response.ok) {
              const errorMessage =
                payload && "error" in payload ? payload.error?.message : undefined;
              throw new Error(errorMessage || "Unable to load challenge opportunities");
            }

            return payload as ChallengeOpportunitiesResponse;
          })
          .then((opportunityResult) => {
            if (requestId === requestIdRef.current) {
              setOpportunities(opportunityResult.items ?? []);
            }
          })
          .catch((error) => {
            console.error(error);
            if (requestId === requestIdRef.current && !forceRefresh) {
              setOpportunities([]);
            }
          })
          .finally(() => {
            if (requestId === requestIdRef.current) {
              setOpportunitiesLoading(false);
            }
          });
      }

      await Promise.allSettled([vsPromise, opportunitiesPromise]);

      if (requestId === requestIdRef.current && forceRefresh) {
        setRefreshing(false);
      }
    },
    [locale, opportunitiesEnabled]
  );

  useEffect(() => {
    void loadExploreData({ showPageLoading: true });
  }, [loadExploreData]);

  const commitMinDraft = useCallback(() => {
    const raw = minDraft.trim().replace(",", ".");
    if (raw === "") {
      updateFilters({ minStake: 0 });
      setMinDraft("");
      return;
    }
    const n = Number(raw);
    const next = normalizeExploreMinStake(n);
    updateFilters({ minStake: next });
    if (next === 0) {
      setMinDraft("");
    } else if (Number.isInteger(next)) {
      setMinDraft(String(next));
    } else {
      setMinDraft(next.toFixed(2));
    }
  }, [minDraft, updateFilters]);

  const handleMinInputChange = useCallback((value: string) => {
    const normalized = value.replace(",", ".");
    if (normalized === "") {
      setMinDraft("");
      return;
    }
    if (/^\d*\.?\d{0,2}$/.test(normalized)) {
      setMinDraft(normalized);
    }
  }, []);

  const open = useMemo(
    () => allVS.filter((vs) => isVSJoinable(vs, address ?? undefined)),
    [address, allVS]
  );

  const filtered = useMemo(
    () => applyExploreFilters(open, filters),
    [open, filters]
  );
  const readyToChallenge = useMemo(() => {
    if (!address) {
      return [];
    }
    return applyExploreFilters(
      allVS.filter((vs) => isVSJoinable(vs, address)),
      { ...filters, sort: "strength" }
    ).slice(0, 3);
  }, [address, allVS, filters]);

  const samplePool = useMemo(() => getExploreSampleCards(), []);
  const filteredSamples = useMemo(
    () => applyExploreFilters(samplePool, filters),
    [samplePool, filters]
  );

  const { cat, sort, search, minStake, needsChallengers, expiringSoon } = filters;

  useEffect(() => {
    if (minStake === 0) {
      setMinDraft("");
    } else if (Number.isInteger(minStake)) {
      setMinDraft(String(minStake));
    } else {
      setMinDraft(minStake.toFixed(2));
    }
  }, [minStake]);

  const hasActiveFilters =
    cat !== DEFAULT_EXPLORE_FILTERS.cat ||
    minStake !== DEFAULT_EXPLORE_FILTERS.minStake ||
    sort !== DEFAULT_EXPLORE_FILTERS.sort ||
    search.trim().length > 0 ||
    needsChallengers !== DEFAULT_EXPLORE_FILTERS.needsChallengers ||
    expiringSoon !== DEFAULT_EXPLORE_FILTERS.expiringSoon;

  const showResultsCount =
    !loading &&
    !(filtered.length === 0 && filteredSamples.length === 0 && hasActiveFilters);

  const resultsMessage = useMemo(() => {
    if (filtered.length > 0) {
      return filtered.length === 1
        ? t("results", { count: filtered.length })
        : t("resultsPlural", { count: filtered.length });
    }
    if (filteredSamples.length > 0) {
      return null;
    }
    return hasActiveFilters ? t("sampleNoMatchIntro") : null;
  }, [filtered.length, filteredSamples.length, hasActiveFilters, t]);

  const sortOnlyOptions: { key: ExploreSort; label: string }[] = useMemo(
    () => [
      { key: "newest", label: t("newest") },
      { key: "highest", label: t("highestStake") },
      { key: "expiring", label: t("expiringSoon") },
      { key: "strength", label: t("strength") },
    ],
    [t]
  );

  const sortTriggerLabel = useMemo(
    () =>
      sortOnlyOptions.find((o) => o.key === sort)?.label ??
      sortOnlyOptions[0].label,
    [sort, sortOnlyOptions]
  );

  const quickFilterTriggerLabel = useMemo(() => {
    if (needsChallengers && expiringSoon) {
      return `${t("needsChallengers")} · ${t("expiringSoon")}`;
    }
    if (needsChallengers) return t("needsChallengers");
    if (expiringSoon) return t("expiringSoon");
    if (sort === "strength" && !needsChallengers && !expiringSoon) {
      return t("strength");
    }
    return t("quickFilterAll");
  }, [expiringSoon, needsChallengers, sort, t]);

  const quickFilterOptionSelected = (
    choice: "all" | "needs" | "soon" | "strength"
  ): boolean => {
    if (choice === "all") {
      return (
        !needsChallengers &&
        !expiringSoon &&
        sort !== "strength"
      );
    }
    if (choice === "needs") return needsChallengers && !expiringSoon;
    if (choice === "soon") return expiringSoon && !needsChallengers;
    return (
      sort === "strength" && !needsChallengers && !expiringSoon
    );
  };

  useEffect(() => {
    if (!sortMenuOpen && !quickFilterMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node;
      if (
        sortMenuRef.current?.contains(node) ||
        quickFilterMenuRef.current?.contains(node)
      ) {
        return;
      }
      setSortMenuOpen(false);
      setQuickFilterMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSortMenuOpen(false);
        setQuickFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [sortMenuOpen, quickFilterMenuOpen]);

  return (
    <PageTransition>
      <AnimatedItem>
        <div className="mb-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-4 sm:gap-6">
            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
              <h1 className="font-display text-2xl font-bold uppercase tracking-tighter text-pv-text sm:text-3xl md:text-4xl">
                {t("title")}
              </h1>
              <div className="h-px min-w-[2rem] flex-1 bg-white/[0.12]" aria-hidden />
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-pv-emerald shadow-[0_0_8px_rgba(78,222,163,0.6)]" />
              <span className="font-mono text-xs text-pv-muted">
                {t("available", { count: open.length })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="block max-w-2xl font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-pv-emerald sm:text-xs">
              {t("lead")}
            </span>
            <CacheFreshnessControls
              freshness={vsFreshness}
              refreshing={refreshing}
              onRefresh={() => {
                void loadExploreData({ forceRefresh: true });
              }}
            />
          </div>
        </div>
      </AnimatedItem>

      <AnimatedItem>
        <ExploreFeaturedCarousel />
      </AnimatedItem>

      <AnimatedItem>
        <section
          className="mb-8"
          aria-label={t("filtersAriaLabel")}
        >
          <div className="rounded-xl border border-white/[0.08] bg-pv-bg/80 p-5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] sm:p-6">
            {/* Sort | filter (2+2); min 2 cols para cifras largas; búsqueda 6 cols. */}
            <div className="grid grid-cols-2 gap-3 gap-y-4 lg:grid-cols-12 lg:gap-4 lg:items-end xl:gap-5">
              <div
                className="relative col-span-1 min-w-0 lg:col-span-2"
                ref={sortMenuRef}
              >
                <label
                  id="explore-sort-label"
                  htmlFor="explore-sort-trigger"
                  className="label"
                >
                  {t("sortBy")}
                </label>
                <button
                  type="button"
                  id="explore-sort-trigger"
                  aria-label={t("sortSelectAria")}
                  aria-expanded={sortMenuOpen}
                  aria-haspopup="listbox"
                  aria-controls="explore-sort-listbox"
                  onClick={() => {
                    setQuickFilterMenuOpen(false);
                    setSortMenuOpen((o) => !o);
                  }}
                  className="input flex h-11 min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 bg-pv-bg py-0 pr-3 text-left font-body text-sm text-pv-text transition-[border-color,box-shadow] hover:border-white/[0.14]"
                >
                  <span className="min-w-0 truncate">{sortTriggerLabel}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-pv-muted transition-transform duration-200 ${
                      sortMenuOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>
                <AnimatePresence>
                  {sortMenuOpen ? (
                    <motion.div
                      key="explore-sort-listbox"
                      id="explore-sort-listbox"
                      role="listbox"
                      aria-labelledby="explore-sort-label"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="absolute left-0 top-full z-40 mt-1.5 w-max min-w-full max-w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded border border-white/[0.1] bg-pv-bg py-1 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85)]"
                    >
                      {sortOnlyOptions.map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          role="option"
                          aria-selected={sort === key}
                          onClick={() => {
                            updateFilters({ sort: key });
                            setSortMenuOpen(false);
                          }}
                          className={`flex w-full items-center px-4 py-2.5 text-left font-body text-sm transition-colors ${
                            sort === key
                              ? "bg-pv-emerald/[0.12] font-medium text-pv-emerald"
                              : "text-pv-muted hover:bg-white/[0.05] hover:text-pv-text"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div
                className="relative col-span-1 min-w-0 lg:col-span-2"
                ref={quickFilterMenuRef}
              >
                <label
                  id="explore-quick-filter-label"
                  htmlFor="explore-quick-filter-trigger"
                  className="label"
                >
                  {t("quickFilterLabel")}
                </label>
                <button
                  type="button"
                  id="explore-quick-filter-trigger"
                  aria-label={t("quickFilterSelectAria")}
                  aria-expanded={quickFilterMenuOpen}
                  aria-haspopup="listbox"
                  aria-controls="explore-quick-filter-listbox"
                  onClick={() => {
                    setSortMenuOpen(false);
                    setQuickFilterMenuOpen((o) => !o);
                  }}
                  className="input flex h-11 min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 bg-pv-bg py-0 pr-3 text-left font-body text-sm text-pv-text transition-[border-color,box-shadow] hover:border-white/[0.14]"
                >
                  <span className="min-w-0 truncate">
                    {quickFilterTriggerLabel}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-pv-muted transition-transform duration-200 ${
                      quickFilterMenuOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>
                <AnimatePresence>
                  {quickFilterMenuOpen ? (
                    <motion.div
                      key="explore-quick-filter-listbox"
                      id="explore-quick-filter-listbox"
                      role="listbox"
                      aria-labelledby="explore-quick-filter-label"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="absolute left-0 top-full z-40 mt-1.5 w-max min-w-full max-w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded border border-white/[0.1] bg-pv-bg py-1 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85)]"
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={quickFilterOptionSelected("all")}
                        onClick={() => {
                          updateFilters({
                            needsChallengers: false,
                            expiringSoon: false,
                            sort: "newest",
                          });
                          setQuickFilterMenuOpen(false);
                        }}
                        className={`flex w-full items-center px-4 py-2.5 text-left font-body text-sm transition-colors ${
                          quickFilterOptionSelected("all")
                            ? "bg-pv-emerald/[0.12] font-medium text-pv-emerald"
                            : "text-pv-muted hover:bg-white/[0.05] hover:text-pv-text"
                        }`}
                      >
                        {t("quickFilterAll")}
                      </button>
                      <button
                        type="button"
                        role="option"
                        aria-selected={quickFilterOptionSelected("needs")}
                        onClick={() => {
                          updateFilters({
                            needsChallengers: true,
                            expiringSoon: false,
                          });
                          setQuickFilterMenuOpen(false);
                        }}
                        className={`flex w-full items-center px-4 py-2.5 text-left font-body text-sm transition-colors ${
                          quickFilterOptionSelected("needs")
                            ? "bg-pv-emerald/[0.12] font-medium text-pv-emerald"
                            : "text-pv-muted hover:bg-white/[0.05] hover:text-pv-text"
                        }`}
                      >
                        {t("needsChallengers")}
                      </button>
                      <button
                        type="button"
                        role="option"
                        aria-selected={quickFilterOptionSelected("soon")}
                        onClick={() => {
                          updateFilters({
                            expiringSoon: true,
                            needsChallengers: false,
                            sort: "expiring",
                          });
                          setQuickFilterMenuOpen(false);
                        }}
                        className={`flex w-full items-center px-4 py-2.5 text-left font-body text-sm transition-colors ${
                          quickFilterOptionSelected("soon")
                            ? "bg-pv-emerald/[0.12] font-medium text-pv-emerald"
                            : "text-pv-muted hover:bg-white/[0.05] hover:text-pv-text"
                        }`}
                      >
                        {t("expiringSoon")}
                      </button>
                      <button
                        type="button"
                        role="option"
                        aria-selected={quickFilterOptionSelected("strength")}
                        onClick={() => {
                          updateFilters({
                            needsChallengers: false,
                            expiringSoon: false,
                            sort: "strength",
                          });
                          setQuickFilterMenuOpen(false);
                        }}
                        className={`flex w-full items-center px-4 py-2.5 text-left font-body text-sm transition-colors ${
                          quickFilterOptionSelected("strength")
                            ? "bg-pv-emerald/[0.12] font-medium text-pv-emerald"
                            : "text-pv-muted hover:bg-white/[0.05] hover:text-pv-text"
                        }`}
                      >
                        {t("strength")}
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="col-span-1 min-w-0 w-full max-w-[7.875rem] lg:col-span-2 lg:w-3/4 lg:max-w-none lg:justify-self-start">
                <label htmlFor="explore-min-stake" className="label">
                  {t("minStake")}
                </label>
                <input
                  id="explore-min-stake"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={t("minStakePlaceholder")}
                  aria-label={t("minStakeInputAria")}
                  value={minDraft}
                  onChange={(e) => handleMinInputChange(e.target.value)}
                  onBlur={commitMinDraft}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  className="input h-11 min-h-[44px] w-full max-w-full bg-pv-bg py-2.5 font-mono text-sm tabular-nums"
                />
              </div>

              <div className="col-span-2 flex min-w-0 flex-col gap-3 lg:col-span-6 lg:flex-row lg:items-end lg:gap-3">
                <div className="flex min-w-0 w-full flex-col lg:flex-1">
                  <label htmlFor="explore-search" className="label">
                    {t("searchHeading")}
                  </label>
                  <div className="relative min-w-0 w-full">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-pv-muted"
                      aria-hidden
                    />
                    <input
                      id="explore-search"
                      type="text"
                      inputMode="search"
                      enterKeyHint="search"
                      autoComplete="off"
                      placeholder={t("searchMarketsPlaceholder")}
                      value={search}
                      onChange={(event) =>
                        updateFilters({ search: event.target.value })
                      }
                      className={`input h-11 min-h-[44px] bg-pv-bg py-2.5 pl-10 font-body text-sm ${
                        search ? "pr-11" : ""
                      }`}
                    />
                    {search ? (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 z-[1] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-pv-muted transition-colors hover:bg-white/[0.06] hover:text-pv-text focus-ring"
                        onClick={() => updateFilters({ search: "" })}
                        aria-label={t("clearSearch")}
                      >
                        <X size={16} strokeWidth={2} />
                      </button>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((o) => !o)}
                  aria-expanded={advancedOpen}
                  className="flex h-11 min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded border border-white/[0.1] bg-pv-bg px-5 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-pv-text transition-colors hover:border-pv-emerald/30 hover:bg-white/[0.04] lg:w-auto"
                >
                  <ListFilter size={16} className="text-pv-muted" aria-hidden />
                  {t("advanced")}
                </button>
              </div>
            </div>

            <motion.div
              initial={false}
              animate={{
                height: advancedOpen ? "auto" : 0,
                opacity: advancedOpen ? 1 : 0,
              }}
              transition={{
                height: {
                  duration: 0.34,
                  ease: [0.25, 0.46, 0.45, 0.94],
                },
                opacity: {
                  duration: 0.22,
                  ease: [0.25, 0.1, 0.25, 1],
                },
              }}
              className={`overflow-hidden ${!advancedOpen ? "pointer-events-none" : ""}`}
              aria-hidden={!advancedOpen}
            >
              <div className="mt-6 border-t border-white/[0.06] pt-6">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-6 sm:items-start">
                  <div className="min-w-0">
                    <span className="mb-3 block font-display text-[10px] font-bold uppercase tracking-[0.22em] text-pv-muted">
                      {t("categoriesHeading")}
                    </span>
                    <div
                      className="flex flex-wrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      role="group"
                      aria-label={t("category")}
                    >
                      <button
                        type="button"
                        aria-pressed={cat === "all"}
                        onClick={() => updateFilters({ cat: "all" })}
                        className={`${filterPillBase} ${
                          cat === "all" ? filterPillActive : filterPillInactive
                        }`}
                      >
                        {t("all")}
                      </button>
                      {EXPLORE_PRIMARY_CATEGORY_ROW.map(({ id, labelKey }) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={cat === id}
                          onClick={() => updateFilters({ cat: id })}
                          className={`${filterPillBase} ${
                            cat === id ? filterPillActive : filterPillInactive
                          }`}
                        >
                          {t(labelKey)}
                        </button>
                      ))}
                      <button
                        type="button"
                        aria-pressed={cat === "clima"}
                        onClick={() => updateFilters({ cat: "clima" })}
                        className={`${filterPillBase} ${
                          cat === "clima" ? filterPillActive : filterPillInactive
                        }`}
                      >
                        <span className="uppercase">{tCat("clima")}</span>
                      </button>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="mb-3 block font-display text-[10px] font-bold uppercase tracking-[0.18em] text-pv-muted">
                      {t("advancedMinPresets")}
                    </span>
                    <div className="flex flex-wrap gap-2" role="group">
                      {MIN_STAKE_OPTIONS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={minStake === value}
                          onClick={() => {
                            updateFilters({ minStake: value });
                            setMinDraft(
                              value === 0 ? "" : String(value)
                            );
                          }}
                          className={`${filterPillBase} ${
                            minStake === value
                              ? filterPillActive
                              : filterPillInactive
                          }`}
                        >
                          {value === 0 ? t("any") : `${value}+ GEN`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </AnimatedItem>

      <div>
        {opportunitiesEnabled && (opportunitiesLoading || opportunities.length > 0) ? (
          <AnimatedItem>
            <section className="mb-8" aria-label={t("challengeOpportunities")}>
              <div className="mb-4 flex flex-col gap-1.5">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald">
                  {t("challengeOpportunities")}
                </div>
                <p className="max-w-3xl text-sm leading-relaxed text-pv-muted">
                  {t("challengeOpportunitiesHint")}
                </p>
              </div>
              {opportunitiesLoading ? (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  <ArenaCardSkeleton />
                  <ArenaCardSkeleton />
                  <ArenaCardSkeleton />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {opportunities.map((opportunity) => (
                    <ChallengeOpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                    />
                  ))}
                </div>
              )}
            </section>
          </AnimatedItem>
        ) : null}

        {isConnected && readyToChallenge.length > 0 ? (
          <AnimatedItem>
            <section className="mb-8" aria-label={t("readyToChallenge")}>
              <div className="mb-4 flex flex-col gap-1.5">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald">
                  {t("readyToChallenge")}
                </div>
                <p className="text-sm leading-relaxed text-pv-muted">
                  {t("readyToChallengeHint")}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {readyToChallenge.map((vs) => (
                  <ArenaCard
                    key={`ready-${vs.id}`}
                    vs={vs}
                    challengersCount={getVSChallengerCount(vs)}
                    viewerAddress={address}
                    hideQualityPills
                  />
                ))}
              </div>
            </section>
          </AnimatedItem>
        ) : null}

        {showResultsCount && resultsMessage ? (
          <AnimatedItem>
            <div className="mb-4 text-xs leading-relaxed text-pv-muted" aria-live="polite">
              {resultsMessage}
            </div>
          </AnimatedItem>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ArenaCardSkeleton />
            <ArenaCardSkeleton />
            <ArenaCardSkeleton />
          </div>
        ) : filtered.length === 0 && filteredSamples.length === 0 ? (
          hasActiveFilters ? (
            <div className="mx-auto flex w-full max-w-lg flex-col items-center rounded-xl border border-white/[0.05] bg-pv-bg/60 px-6 py-8 text-center backdrop-blur-[1px] sm:px-8 sm:py-10">
              <p className="mb-4 max-w-[40ch] text-xs leading-relaxed text-pv-muted">
                {t("sampleNoMatchIntro")}
              </p>
              <p className="mb-6 max-w-[34ch] text-sm leading-relaxed text-pv-muted">
                {t("sampleCreateHint")}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth={false}
                  onClick={resetFilters}
                >
                  {t("resetFilters")}
                </Button>
                <Link href="/vs/create" className="inline-block">
                  <Button variant="primary" fullWidth={false}>
                    {t("challengeSomeone")}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              title={t("noResults")}
              description={t("noResultsDesc")}
              actionLabel={t("challengeSomeone")}
              actionHref="/vs/create"
            />
          )
        ) : filtered.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <div>
              {/* Featured duels — first 2 items get expanded Stage treatment */}
              {filtered.length > 2 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                  {filtered.slice(0, 2).map((vs) => (
                    <motion.div
                      key={vs.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Stage glow="both" className="border border-white/[0.08]">
                        <ArenaCard
                          vs={vs}
                          challengersCount={getVSChallengerCount(vs)}
                          viewerAddress={address}
                          hideQualityPills
                        />
                      </Stage>
                    </motion.div>
                  ))}
                </div>
              )}
              {/* Remaining items as compact grid */}
              <motion.div layout className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {(filtered.length > 2 ? filtered.slice(2) : filtered).map((vs) => (
                  <motion.div
                    key={vs.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ArenaCard
                      vs={vs}
                      challengersCount={getVSChallengerCount(vs)}
                      viewerAddress={address}
                      hideQualityPills
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div layout className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSamples.map((vs) => (
                <motion.div
                  key={vs.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArenaCard
                    vs={vs}
                    challengersCount={getVSChallengerCount(vs)}
                    viewerAddress={address}
                    hideQualityPills
                    isSample
                    sampleBadgeLabel={t("sampleBadge")}
                    categoryFilterHref={`/explorer?${serializeExploreFilters({
                      ...DEFAULT_EXPLORE_FILTERS,
                      cat: vs.category,
                    })}`}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </PageTransition>
  );
}
