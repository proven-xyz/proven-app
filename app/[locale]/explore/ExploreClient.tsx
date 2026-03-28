"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getAllVSFast, isVSJoinable, type VSData } from "@/lib/contract";
import { mergePendingVS } from "@/lib/pending-vs";
import { CATEGORIES } from "@/lib/constants";
import {
  applyExploreFilters,
  DEFAULT_EXPLORE_FILTERS,
  MIN_STAKE_OPTIONS,
  serializeExploreFilters,
} from "@/lib/exploreFilters";
import { useExploreFilterState } from "@/hooks/useExploreFilterState";
import { getExploreSampleCards } from "@/lib/sampleVs";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { Button, Chip, VSCardSkeleton } from "@/components/ui";
import VSCard from "@/components/VSCard";
import EmptyState from "@/components/EmptyState";
import { Search, X } from "lucide-react";

const EMERALD = "#4edea3";

export default function ExploreClient() {
  const { filters, updateFilters, resetFilters } = useExploreFilterState();
  const [allVS, setAllVS] = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);

  const t = useTranslations("explore");
  const tCat = useTranslations("categories");

  useEffect(() => {
    async function load() {
      try {
        const results = await getAllVSFast();
        setAllVS(mergePendingVS(results));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const open = useMemo(
    () => allVS.filter((vs) => isVSJoinable(vs)),
    [allVS]
  );

  const filtered = useMemo(
    () => applyExploreFilters(open, filters),
    [open, filters]
  );

  const samplePool = useMemo(() => getExploreSampleCards(), []);
  const filteredSamples = useMemo(
    () => applyExploreFilters(samplePool, filters),
    [samplePool, filters]
  );

  const { cat, minStake, sort, search } = filters;
  const hasActiveFilters =
    cat !== DEFAULT_EXPLORE_FILTERS.cat ||
    minStake !== DEFAULT_EXPLORE_FILTERS.minStake ||
    sort !== DEFAULT_EXPLORE_FILTERS.sort ||
    search.trim().length > 0;

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
      return open.length === 0 ? t("sampleIntroEmpty") : t("sampleIntroFiltered");
    }
    return hasActiveFilters ? t("sampleNoMatchIntro") : null;
  }, [filtered.length, filteredSamples.length, open.length, hasActiveFilters, t]);

  return (
    <PageTransition>
      <AnimatedItem>
        <div className="mb-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-4 sm:gap-6">
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
          <span className="block max-w-2xl font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-pv-emerald sm:text-xs">
            {t("lead")}
          </span>
        </div>
      </AnimatedItem>

      <AnimatedItem>
        <div className="relative mb-4" role="search">
          <label htmlFor="explore-search" className="sr-only">
            {t("searchPlaceholder")}
          </label>
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-pv-muted"
            aria-hidden
          />
          <input
            id="explore-search"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(event) => updateFilters({ search: event.target.value })}
            className={`input min-h-[44px] pl-10 ${search ? "pr-11" : ""}`}
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
      </AnimatedItem>

      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:items-start lg:gap-6">
        <AnimatedItem>
          <aside
            className="card mb-6 border-pv-emerald/[0.08] p-5 lg:sticky lg:top-[72px] lg:mb-0"
            aria-label={t("filtersAriaLabel")}
          >
            <div className="mb-4">
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="label">{t("category")}</legend>
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t("category")}>
                  <Chip
                    active={cat === "all"}
                    color={EMERALD}
                    onClick={() => updateFilters({ cat: "all" })}
                  >
                    {t("all")}
                  </Chip>
                  {CATEGORIES.map((category) => (
                    <Chip
                      key={category.id}
                      active={cat === category.id}
                      color={EMERALD}
                      onClick={() => updateFilters({ cat: category.id })}
                    >
                      {tCat(category.id)}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mb-4">
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="label">{t("minStake")}</legend>
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t("minStake")}>
                  {MIN_STAKE_OPTIONS.map((value) => (
                    <Chip
                      key={value}
                      active={minStake === value}
                      color={EMERALD}
                      onClick={() => updateFilters({ minStake: value })}
                    >
                      {value === 0 ? t("any") : `$${value}+`}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>

            <div>
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="label">{t("sortBy")}</legend>
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t("sortBy")}>
                  {(
                    [
                      { key: "newest" as const, label: t("newest") },
                      { key: "highest" as const, label: t("highestStake") },
                      { key: "expiring" as const, label: t("expiring") },
                    ] as const
                  ).map(({ key, label }) => (
                    <Chip
                      key={key}
                      active={sort === key}
                      color={EMERALD}
                      onClick={() => updateFilters({ sort: key })}
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>
          </aside>
        </AnimatedItem>

        <div>
          {showResultsCount && resultsMessage ? (
            <AnimatedItem>
              <div className="mb-4 text-xs leading-relaxed text-pv-muted" aria-live="polite">
                {resultsMessage}
              </div>
            </AnimatedItem>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <VSCardSkeleton />
              <VSCardSkeleton />
              <VSCardSkeleton />
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
              <motion.div layout className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                {filtered.map((vs) => (
                  <motion.div
                    key={vs.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    <VSCard
                      vs={vs}
                      showCategory={cat === "all"}
                      showAcceptCTA
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div layout className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                {filteredSamples.map((vs) => (
                  <motion.div
                    key={vs.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    <VSCard
                      vs={vs}
                      showCategory
                      showAcceptCTA
                      isSample
                      showChallengesLabel={false}
                      categoryFilterHref={`/explore?${serializeExploreFilters({
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
      </div>
    </PageTransition>
  );
}
