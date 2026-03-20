"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet";
import { getVS, getVSCount } from "@/lib/contract";
import type { VSData } from "@/lib/contract";
import { ZERO_ADDRESS, shortenAddress, CATEGORIES, getCategoryInfo } from "@/lib/constants";

export default function ExplorePage() {
  const { isConnected, connect } = useWallet();
  const [allVS, setAllVS] = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");
  const [minStake, setMinStake] = useState(0);
  const [sort, setSort] = useState<"newest" | "highest" | "expiring">("newest");

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

  if (sort === "highest") filtered = [...filtered].sort((a, b) => b.stake_amount - a.stake_amount);
  else if (sort === "expiring") filtered = [...filtered].sort((a, b) => a.deadline - b.deadline);
  else filtered = [...filtered].sort((a, b) => b.id - a.id);

  return (
    <div>
      <Link href="/" className="text-sm text-pv-muted hover:text-pv-text mb-5 inline-block">← Volver</Link>

      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl font-bold">VS Abiertos</h1>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-pv-cyan shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
          <span className="font-mono text-xs text-pv-muted">{open.length} disponibles</span>
        </div>
      </div>
      <p className="text-sm text-pv-muted mb-6">Aceptá el VS de alguien más. Elegí tu pelea.</p>

      {/* Filters */}
      <div className="card p-5 mb-6">
        {/* Category */}
        <div className="mb-4">
          <label className="label">Categoría</label>
          <div className="flex gap-1.5 flex-wrap">
            <FilterChip active={cat === "all"} color="#FAFAFA" onClick={() => setCat("all")}>Todos</FilterChip>
            {CATEGORIES.filter(c => c.id !== "custom").map((c) => (
              <FilterChip key={c.id} active={cat === c.id} color={c.color} onClick={() => setCat(c.id)}>
                {c.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Min stake */}
        <div className="mb-4">
          <label className="label">Apuesta mínima</label>
          <div className="flex gap-1.5">
            {[0, 2, 5, 10].map((v) => (
              <FilterChip key={v} active={minStake === v} color="#FBBF24" onClick={() => setMinStake(v)}>
                {v === 0 ? "Cualquiera" : `$${v}+`}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="label">Ordenar</label>
          <div className="flex gap-1.5">
            {([
              { k: "newest" as const, l: "Más nuevos" },
              { k: "highest" as const, l: "Mayor apuesta" },
              { k: "expiring" as const, l: "Por vencer" },
            ]).map(({ k, l }) => (
              <FilterChip key={k} active={sort === k} color="#22D3EE" onClick={() => setSort(k)}>
                {l}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-pv-muted mb-4">
        {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-16 text-pv-muted text-sm">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-display font-bold text-lg text-pv-muted mb-3">No hay VS con estos filtros</p>
          <p className="text-sm text-pv-muted mb-5">Probá cambiando los filtros o creá tu propio VS.</p>
          <Link href="/vs/create" className="btn-primary w-auto inline-block px-8 text-center">
            Desafiar a alguien
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((vs) => {
            const catInfo = getCategoryInfo(vs.category);
            return (
              <Link key={vs.id} href={`/vs/${vs.id}`} className="block">
                <div className="card p-5 hover:border-white/10 transition-all relative">
                  <div className="absolute top-0 left-0 w-2/5 h-full bg-[radial-gradient(ellipse_at_0%_50%,rgba(34,211,238,0.04),transparent_65%)] pointer-events-none" />
                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold">{shortenAddress(vs.creator)}</span>
                        <span className="text-xs text-pv-muted">desafía</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {cat === "all" && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                            style={{
                              backgroundColor: catInfo.color + "12",
                              borderColor: catInfo.color + "20",
                              color: catInfo.color,
                              border: "1px solid",
                            }}
                          >
                            {catInfo.label}
                          </span>
                        )}
                        <span className="font-mono text-[13px] font-bold text-pv-gold">${vs.stake_amount * 2}</span>
                      </div>
                    </div>

                    {/* Question */}
                    <div className="font-display text-lg font-bold leading-snug mb-3.5">{vs.question}</div>

                    {/* Position strip */}
                    <div className="flex rounded-xl overflow-hidden border border-pv-surface2 mb-3.5">
                      <div className="flex-1 px-3 py-2 bg-pv-cyan/[0.03]">
                        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-cyan/50">Creador</div>
                        <div className="text-xs font-medium mt-0.5">{vs.creator_position}</div>
                      </div>
                      <div className="w-px bg-pv-surface2" />
                      <div className="flex-1 px-3 py-2 bg-pv-fuch/[0.03]">
                        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-fuch/50">Rival</div>
                        <div className="text-xs font-medium mt-0.5 text-pv-muted italic">Esperando...</div>
                      </div>
                    </div>

                    {/* Accept CTA */}
                    <div className="w-full py-3 rounded-xl bg-pv-fuch/10 border border-pv-fuch/20 text-center font-display text-sm font-bold text-pv-fuch">
                      Aceptar y Poner ${vs.stake_amount}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  children,
  active,
  color,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="chip text-xs whitespace-nowrap"
      style={{
        borderColor: active ? color + "40" : undefined,
        backgroundColor: active ? color + "12" : undefined,
        color: active ? color : undefined,
      }}
    >
      {children}
    </button>
  );
}
