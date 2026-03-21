"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getVS, getVSCount } from "@/lib/contract";
import type { VSData } from "@/lib/contract";
import { CATEGORIES, PV_EMERALD_HEX } from "@/lib/constants";
import {
  applyExploreFilters,
  DEFAULT_EXPLORE_FILTERS,
  MIN_STAKE_OPTIONS,
  serializeExploreFilters,
} from "@/lib/exploreFilters";
import { useExploreFilterState } from "@/hooks/useExploreFilterState";
import { getExploreSampleCards } from "@/lib/sampleVs";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { Chip, VSCardSkeleton, Button } from "@/components/ui";
import VSCard from "@/components/VSCard";
import { ArrowLeft, Search, X } from "lucide-react";

export default function ExploreClient() {
  const { filters, updateFilters, resetFilters } = useExploreFilterState();

  const [allVS, setAllVS] = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);

  const t = useTranslations("explore");
  const tc = useTranslations("common");
  const tCat = useTranslations("categories");

  useEffect(() => {
    async function load() {
      try {
        const count = await getVSCount();
        const promises = Array.from({ length: count }, (_, i) => getVS(i + 1));
        const results = await Promise.all(promises);
        setAllVS(results.filter((v): v is VSData => v !== null));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const open = useMemo(
    () => allVS.filter((v) => v.state === "open"),
    [allVS]
  );

  const filtered = useMemo(
    () => applyExploreFilters(open, filters),
    [open, filters]
  );

  /** Pool fijo de demos (ids negativos); el mismo `applyExploreFilters` que los VS on-chain. */
  const samplePool = useMemo(() => getExploreSampleCards(), []);
  const filteredSamples = useMemo(
    () => applyExploreFilters(samplePool, filters),
    [samplePool, filters]
  );

  const { cat, minStake, sort, search } = filters;

  const hasActiveFilters =
    cat !== "all" || minStake > 0 || sort !== "newest" || search.trim().length > 0;

  return (
    <PageTransition>
      <AnimatedItem>
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-pv-muted transition-colors hover:text-pv-text"
        >
          <ArrowLeft size={14} />
          {tc("back")}
        </Link>
      </AnimatedItem>

      <AnimatedItem>
        <div className="mb-6">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald/80">
            {t("eyebrow")}
          </div>
          <div className="flex items-end justify-between gap-3">
            <h1 className="font-display text-[clamp(1.5rem,5vw,2.25rem)] font-bold leading-none tracking-tight">
              {t("title")}
            </h1>
            <div className="flex flex-shrink-0 items-center gap-1.5 pb-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-pv-emerald shadow-[0_0_8px_rgba(78,222,163,0.6)]" />
              <span className="font-mono text-xs text-pv-muted">
                {t("available", { count: open.length })}
              </span>
            </div>
          </div>
          <p className="mt-2 font-mono text-sm tracking-wide text-pv-muted">
            {t("subtitle")}
          </p>
        </div>
      </AnimatedItem>

      {/* Search — escribe en la URL (?q=) */}
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
            onChange={(e) => updateFilters({ search: e.target.value })}
            className={`input min-h-[44px] pl-10 ${search ? "pr-11" : ""}`}
          />
          {search ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 z-[1] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-pv-muted transition-colors hover:bg-white/[0.06] hover:text-pv-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pv-emerald/50"
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
                <div
                  className="mt-2 flex flex-wrap gap-1.5"
                  role="group"
                  aria-label={t("category")}
                >
                  <Chip
                    active={cat === "all"}
                    color={PV_EMERALD_HEX}
                    onClick={() => updateFilters({ cat: "all" })}
                  >
                    {t("all")}
                  </Chip>
                  {CATEGORIES.filter((c) => c.id !== "custom").map((c) => (
                    <Chip
                      key={c.id}
                      active={cat === c.id}
                      color={PV_EMERALD_HEX}
                      onClick={() => updateFilters({ cat: c.id })}
                    >
                      {tCat(c.id)}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mb-4">
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="label">{t("minStake")}</legend>
                <div
                  className="mt-2 flex flex-wrap gap-1.5"
                  role="group"
                  aria-label={t("minStake")}
                >
                  {MIN_STAKE_OPTIONS.map((v) => (
                    <Chip
                      key={v}
                      active={minStake === v}
                      color={PV_EMERALD_HEX}
                      onClick={() => updateFilters({ minStake: v })}
                    >
                      {v === 0 ? t("any") : `$${v}+`}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>

            <div>
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="label">{t("sortBy")}</legend>
                <div
                  className="mt-2 flex flex-wrap gap-1.5"
                  role="group"
                  aria-label={t("sortBy")}
                >
                  {(
                    [
                      { k: "newest" as const, l: t("newest") },
                      { k: "highest" as const, l: t("highestStake") },
                      { k: "expiring" as const, l: t("expiring") },
                    ] as const
                  ).map(({ k, l }) => (
                    <Chip
                      key={k}
                      active={sort === k}
                      color={PV_EMERALD_HEX}
                      onClick={() => updateFilters({ sort: k })}
                    >
                      {l}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>
          </aside>
        </AnimatedItem>

        <div>
          <AnimatedItem>
            {!loading &&
            !(
              filtered.length === 0 &&
              filteredSamples.length === 0 &&
              hasActiveFilters
            ) ? (
              <div className="mb-4 text-xs leading-relaxed text-pv-muted" aria-live="polite">
                {filtered.length === 0 ? (
                  filteredSamples.length === 0 ? (
                    t("sampleNoMatchIntro")
                  ) : open.length === 0 ? (
                    t("sampleIntroEmpty")
                  ) : (
                    t("sampleIntroFiltered")
                  )
                ) : filtered.length === 1 ? (
                  t("results", { count: filtered.length })
                ) : (
                  t("resultsPlural", { count: filtered.length })
                )}
              </div>
            ) : null}
          </AnimatedItem>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <VSCardSkeleton />
              <VSCardSkeleton />
              <VSCardSkeleton />
            </div>
          ) : filtered.length === 0 && filteredSamples.length === 0 ? (
            hasActiveFilters ? (
              <div className="mx-auto flex w-full max-w-lg flex-col items-center rounded-xl border border-white/[0.05] bg-pv-bg/60 px-6 py-8 text-center shadow-none backdrop-blur-[1px] sm:px-8 sm:py-10">
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
            ) : null
          ) : filtered.length === 0 ? (
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                <motion.div
                  layout
                  className="grid grid-cols-1 gap-2.5 lg:grid-cols-2"
                >
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
            </div>
          ) : (
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
                      showChallengesLabel={false}
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
