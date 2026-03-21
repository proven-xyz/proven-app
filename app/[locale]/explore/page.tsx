"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import { getVS, getVSCount } from "@/lib/contract";
import type { VSData } from "@/lib/contract";
import { CATEGORIES } from "@/lib/constants";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { Chip, VSCardSkeleton } from "@/components/ui";
import VSCard from "@/components/VSCard";
import EmptyState from "@/components/EmptyState";
import { ArrowLeft, Search } from "lucide-react";

export default function ExplorePage() {
  const { isConnected } = useWallet();
  const [allVS, setAllVS]       = useState<VSData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [cat, setCat]           = useState("all");
  const [minStake, setMinStake] = useState(0);
  const [sort, setSort]         = useState<"newest" | "highest" | "expiring">("newest");
  const [search, setSearch]     = useState("");
  const t    = useTranslations("explore");
  const tc   = useTranslations("common");
  const tCat = useTranslations("categories");

  useEffect(() => {
    async function load() {
      try {
        const count    = await getVSCount();
        const promises = Array.from({ length: count }, (_, i) => getVS(i + 1));
        const results  = await Promise.all(promises);
        setAllVS(results.filter((v): v is VSData => v !== null));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const open = allVS.filter((v) => v.state === "open");

  let filtered = open;
  if (cat !== "all") filtered = filtered.filter((v) => v.category === cat);
  if (minStake > 0)  filtered = filtered.filter((v) => v.stake_amount >= minStake);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (v) =>
        v.question.toLowerCase().includes(q) ||
        v.creator_position.toLowerCase().includes(q)
    );
  }

  if (sort === "highest")
    filtered = [...filtered].sort((a, b) => b.stake_amount - a.stake_amount);
  else if (sort === "expiring")
    filtered = [...filtered].sort((a, b) => a.deadline - b.deadline);
  else
    filtered = [...filtered].sort((a, b) => b.id - a.id);

  return (
    <PageTransition>
      <AnimatedItem>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-pv-muted hover:text-pv-text mb-5 transition-colors"
        >
          <ArrowLeft size={14} />
          {tc("back")}
        </Link>
      </AnimatedItem>

      <AnimatedItem>
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("title")}</h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-pv-cyan shadow-[0_0_8px_rgba(93,230,255,0.6)]" />
            <span className="font-mono text-xs text-pv-muted">
              {t("available", { count: open.length })}
            </span>
          </div>
        </div>
        <p className="text-sm text-pv-muted mb-6">{t("subtitle")}</p>
      </AnimatedItem>

      {/* Search */}
      <AnimatedItem>
        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pv-muted"
          />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 focus-ring"
          />
        </div>
      </AnimatedItem>

      {/* Desktop: sidebar + results — Mobile: stacked */}
      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6 lg:items-start">

        {/* Filters sidebar */}
        <AnimatedItem>
          <div className="card p-5 mb-6 lg:mb-0 lg:sticky lg:top-[72px]">
            <div className="mb-4">
              <label className="label">{t("category")}</label>
              <div className="flex gap-1.5 flex-wrap">
                <Chip active={cat === "all"} onClick={() => setCat("all")}>
                  {t("all")}
                </Chip>
                {CATEGORIES.filter((c) => c.id !== "custom").map((c) => (
                  <Chip
                    key={c.id}
                    active={cat === c.id}
                    color={c.color}
                    onClick={() => setCat(c.id)}
                  >
                    {tCat(c.id)}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="label">{t("minStake")}</label>
              <div className="flex gap-1.5 flex-wrap">
                {[0, 2, 5, 10].map((v) => (
                  <Chip
                    key={v}
                    active={minStake === v}
                    color="#FBBF24"
                    onClick={() => setMinStake(v)}
                  >
                    {v === 0 ? t("any") : `$${v}+`}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <label className="label">{t("sortBy")}</label>
              <div className="flex gap-1.5 flex-wrap">
                {(
                  [
                    { k: "newest"   as const, l: t("newest") },
                    { k: "highest"  as const, l: t("highestStake") },
                    { k: "expiring" as const, l: t("expiring") },
                  ] as const
                ).map(({ k, l }) => (
                  <Chip
                    key={k}
                    active={sort === k}
                    color="#5de6ff"
                    onClick={() => setSort(k)}
                  >
                    {l}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </AnimatedItem>

        {/* Results column */}
        <div>
          <AnimatedItem>
            <div className="text-xs text-pv-muted mb-4">
              {filtered.length === 1
                ? t("results", { count: filtered.length })
                : t("resultsPlural", { count: filtered.length })}
            </div>
          </AnimatedItem>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <VSCardSkeleton />
              <VSCardSkeleton />
              <VSCardSkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={t("noResults")}
              description={t("noResultsDesc")}
              actionLabel={t("challengeSomeone")}
              actionHref="/vs/create"
            />
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                {filtered.map((vs) => (
                  <motion.div
                    key={vs.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    <VSCard vs={vs} showCategory={cat === "all"} showAcceptCTA />
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
