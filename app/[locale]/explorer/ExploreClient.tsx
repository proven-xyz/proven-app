"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getAllVSFast,
  getVSChallengerCount,
  isVSJoinable,
  type VSData,
} from "@/lib/contract";
import { mergePendingVS } from "@/lib/pending-vs";
import type { CategoryId } from "@/lib/constants";
import {
  applyExploreFilters,
  DEFAULT_EXPLORE_FILTERS,
  MIN_STAKE_OPTIONS,
  normalizeExploreMinStake,
  serializeExploreFilters,
  type ExploreSort,
} from "@/lib/exploreFilters";
import { useExploreFilterState } from "@/hooks/useExploreFilterState";
import { getExploreSampleCards } from "@/lib/sampleVs";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { Button, ArenaCardSkeleton } from "@/components/ui";
import ArenaCard from "@/components/ArenaCard";
import EmptyState from "@/components/EmptyState";
import { ChevronDown, ListFilter, Search, X } from "lucide-react";
import Image from "next/image";

/** Fila principal de categorías: ids reales del contrato + copia tipo “mercado” (ESPORTS/POLÍTICA apuntan a cultura/custom). */
const PRIMARY_CATEGORY_ROW: { id: CategoryId; labelKey: string }[] = [
  { id: "deportes", labelKey: "catSports" },
  { id: "crypto", labelKey: "catCrypto" },
  { id: "tech", labelKey: "catTech" },
  { id: "cultura", labelKey: "catEsports" },
  { id: "custom", labelKey: "catPolitics" },
];

/** Píldoras de filtro (CATEGORIES + Quick minimum): borde tipo botón, mismo hover. */
const filterPillBase =
  "shrink-0 rounded border px-4 py-2 font-display text-xs font-bold uppercase tracking-tight transition-[color,border-color,background-color] focus-ring";
const filterPillActive = "border-pv-emerald/50 bg-pv-emerald text-pv-bg";
const filterPillInactive =
  "border-white/[0.15] bg-transparent text-pv-muted hover:border-white/[0.28] hover:text-pv-text";

export default function ExploreClient() {
  const { filters, updateFilters, resetFilters } = useExploreFilterState();
  const [allVS, setAllVS] = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [minDraft, setMinDraft] = useState("");
  const sortMenuRef = useRef<HTMLDivElement>(null);

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

  const { cat, sort, search, minStake } = filters;

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
      return null;
    }
    return hasActiveFilters ? t("sampleNoMatchIntro") : null;
  }, [filtered.length, filteredSamples.length, hasActiveFilters, t]);

  const sortOptions: { key: ExploreSort; label: string }[] = [
    { key: "newest", label: t("newest") },
    { key: "highest", label: t("highestStake") },
    { key: "expiring", label: t("expiring") },
  ];

  const sortLabel =
    sortOptions.find((o) => o.key === sort)?.label ?? sortOptions[0].label;

  useEffect(() => {
    if (!sortMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(e.target as Node)
      ) {
        setSortMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [sortMenuOpen]);

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
        <section
          className="mb-8"
          aria-label={t("filtersAriaLabel")}
        >
          <div className="rounded-lg border border-white/[0.1] bg-pv-surface p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] sm:p-6">
            {/* Sort, min stake, búsqueda + avanzado — móvil: sort|min en fila; búsqueda; ADVANCED debajo. lg: fila única 12 cols. */}
            <div className="grid grid-cols-2 gap-3 gap-y-4 lg:grid-cols-12 lg:gap-6 lg:items-end">
              <div className="relative col-span-1 min-w-0 lg:col-span-3" ref={sortMenuRef}>
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
                  onClick={() => setSortMenuOpen((o) => !o)}
                  className="input flex h-11 min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 bg-pv-bg py-0 pr-3 text-left font-body text-sm text-pv-text transition-[border-color,box-shadow] hover:border-white/[0.14]"
                >
                  <span className="min-w-0 truncate">{sortLabel}</span>
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
                      className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded border border-white/[0.1] bg-pv-bg py-1 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85)]"
                    >
                      {sortOptions.map(({ key, label }) => (
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

              <div className="col-span-1 min-w-0 lg:col-span-2">
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
                  className="input h-11 min-h-[44px] bg-pv-bg py-2.5 font-mono text-sm tabular-nums"
                />
              </div>

              <div className="col-span-2 flex flex-col gap-3 lg:col-span-7 lg:flex-row lg:items-end lg:gap-3">
                <label htmlFor="explore-search" className="sr-only">
                  {t("searchMarketsPlaceholder")}
                </label>
                <div className="relative min-w-0 w-full lg:flex-1">
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

            {advancedOpen ? (
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
                      {PRIMARY_CATEGORY_ROW.map(({ id, labelKey }) => (
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
                          {value === 0 ? t("any") : `$${value}+`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </AnimatedItem>

      <AnimatedItem>
        <section
          className="mb-8"
          aria-labelledby="explore-featured-title"
        >
          <div className="group relative min-h-[280px] overflow-hidden rounded-lg border border-white/[0.12] bg-pv-bg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] sm:min-h-[300px]">
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src="/images/fight-11.png"
                alt={t("featuredEventImageAlt")}
                fill
                className="object-cover object-center transition-[transform] duration-[750ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] will-change-transform group-hover:scale-[1.045]"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
                priority={false}
              />
            </div>
            {/* Lectura en columna izquierda: contraste sobre la foto */}
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/[0.82] via-black/[0.48] to-black/[0.32]"
              aria-hidden
            />
            {/* Sombreado inferior: más denso abajo, se diluye hacia arriba (detrás del copy) */}
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/[0.78] via-black/[0.28] to-transparent sm:from-black/[0.72] sm:via-black/[0.2]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-0 top-0 z-[2] h-0 w-1 bg-pv-emerald transition-[height] duration-500 ease-out group-hover:h-full"
              aria-hidden
            />
            <div className="relative z-10 p-6 sm:p-8">
              <p className="mb-6 sm:mb-7">
                <span className="inline-flex rounded border border-pv-emerald/35 bg-pv-emerald/[0.1] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-pv-emerald">
                  {t("featuredEventPill")}
                </span>
              </p>
              <h2
                id="explore-featured-title"
                className="text-left font-display text-3xl font-bold uppercase leading-[1.08] tracking-tight text-pv-text sm:text-4xl md:text-5xl lg:text-6xl"
              >
                <span className="block">{t("featuredTitleLine1")}</span>
                <span className="mt-2 block uppercase text-pv-emerald sm:mt-2.5">
                  {t("featuredTitleLine2")}
                </span>
              </h2>
              <p className="mt-4 max-w-3xl whitespace-pre-line text-left text-sm leading-relaxed text-pv-muted sm:mt-5 sm:text-[15px]">
                {t("featuredBody")}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
                <Button type="button" variant="primary" fullWidth={false}>
                  {t("featuredCtaPrimary")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth={false}
                  className="!border !border-white/[0.18] !bg-white/[0.06] !text-pv-text shadow-none hover:!border-white/[0.28] hover:!bg-white/[0.1]"
                >
                  {t("featuredCtaSecondary")}
                </Button>
              </div>
            </div>
          </div>
        </section>
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
            <motion.div layout className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((vs) => (
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
                  />
                </motion.div>
              ))}
            </motion.div>
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
