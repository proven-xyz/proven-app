"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  const [allVS, setAllVS] = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");
  const [minStake, setMinStake] = useState(0);
  const [sort, setSort] = useState<"newest" | "highest" | "expiring">(
    "newest"
  );
  const [search, setSearch] = useState("");

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

  const open = allVS.filter((v) => v.state === "open");

  let filtered = open;
  if (cat !== "all") filtered = filtered.filter((v) => v.category === cat);
  if (minStake > 0) filtered = filtered.filter((v) => v.stake_amount >= minStake);
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
  else filtered = [...filtered].sort((a, b) => b.id - a.id);

  return (
    <PageTransition>
      <AnimatedItem>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-pv-muted hover:text-pv-text mb-5 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver
        </Link>
      </AnimatedItem>

      <AnimatedItem>
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-2xl font-bold">VS Abiertos</h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-pv-cyan shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
            <span className="font-mono text-xs text-pv-muted">
              {open.length} disponibles
            </span>
          </div>
        </div>
        <p className="text-sm text-pv-muted mb-6">
          Aceptá el VS de alguien más. Elegí tu pelea.
        </p>
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
            placeholder="Buscar VS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 focus-ring"
          />
        </div>
      </AnimatedItem>

      {/* Filters */}
      <AnimatedItem>
        <div className="card p-5 mb-6">
          <div className="mb-4">
            <label className="label">Categoría</label>
            <div className="flex gap-1.5 flex-wrap">
              <Chip
                active={cat === "all"}
                onClick={() => setCat("all")}
              >
                Todos
              </Chip>
              {CATEGORIES.filter((c) => c.id !== "custom").map((c) => (
                <Chip
                  key={c.id}
                  active={cat === c.id}
                  color={c.color}
                  onClick={() => setCat(c.id)}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="label">Apuesta mínima</label>
            <div className="flex gap-1.5">
              {[0, 2, 5, 10].map((v) => (
                <Chip
                  key={v}
                  active={minStake === v}
                  color="#FBBF24"
                  onClick={() => setMinStake(v)}
                >
                  {v === 0 ? "Cualquiera" : `$${v}+`}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Ordenar</label>
            <div className="flex gap-1.5">
              {(
                [
                  { k: "newest" as const, l: "Más nuevos" },
                  { k: "highest" as const, l: "Mayor apuesta" },
                  { k: "expiring" as const, l: "Por vencer" },
                ] as const
              ).map(({ k, l }) => (
                <Chip
                  key={k}
                  active={sort === k}
                  color="#22D3EE"
                  onClick={() => setSort(k)}
                >
                  {l}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </AnimatedItem>

      {/* Results count */}
      <AnimatedItem>
        <div className="text-xs text-pv-muted mb-4">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </div>
      </AnimatedItem>

      {/* Results */}
      {loading ? (
        <div className="flex flex-col gap-3">
          <VSCardSkeleton />
          <VSCardSkeleton />
          <VSCardSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No hay VS con estos filtros"
          description="Probá cambiando los filtros o creá tu propio VS."
          actionLabel="Desafiar a alguien"
          actionHref="/vs/create"
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div layout className="flex flex-col gap-2.5">
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
      )}
    </PageTransition>
  );
}
