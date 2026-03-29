import type { VSData } from "@/lib/contract";
import { CATEGORIES } from "@/lib/constants";

export type ExploreSort = "newest" | "highest" | "expiring";

export interface ExploreFilterState {
  cat: string;
  minStake: number;
  sort: ExploreSort;
  search: string;
}

export const DEFAULT_EXPLORE_FILTERS: ExploreFilterState = {
  cat: "all",
  minStake: 0,
  sort: "newest",
  search: "",
};

/** Valores permitidos para `minStake` (URL `?min=`) y chips del sidebar Explore */
export const MIN_STAKE_OPTIONS = [0, 2, 5, 10, 20] as const;
const SORT_OPTIONS: ExploreSort[] = ["newest", "highest", "expiring"];

const VALID_CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

function isValidCategoryId(id: string): boolean {
  return VALID_CATEGORY_IDS.has(id);
}

/** Redondea a 2 decimales; 0 si no es finito o es negativo. Tope defensivo para URLs. */
export function normalizeExploreMinStake(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  const rounded = Math.round(n * 100) / 100;
  return Math.min(rounded, 1_000_000);
}

/** Lee y valida query params (?cat=&min=&sort=&q=). Valores inválidos → defaults. */
export function parseExploreSearchParams(sp: URLSearchParams): ExploreFilterState {
  const catRaw = sp.get("cat") ?? "all";
  const cat =
    catRaw === "all" || isValidCategoryId(catRaw) ? catRaw : "all";

  const minRaw = sp.get("min");
  const minParsed = minRaw === null || minRaw === "" ? 0 : Number(minRaw);
  const minStake = normalizeExploreMinStake(minParsed);

  const sortRaw = (sp.get("sort") ?? "newest").toLowerCase();
  const sort = SORT_OPTIONS.includes(sortRaw as ExploreSort)
    ? (sortRaw as ExploreSort)
    : "newest";

  const search = sp.get("q") ?? "";

  return { cat, minStake, sort, search };
}

/** Serializa solo desviaciones respecto a defaults (URLs limpias). */
export function serializeExploreFilters(f: ExploreFilterState): string {
  const p = new URLSearchParams();
  if (f.cat !== "all") p.set("cat", f.cat);
  if (f.minStake !== 0) p.set("min", String(f.minStake));
  if (f.sort !== "newest") p.set("sort", f.sort);
  const q = f.search.trim();
  if (q) p.set("q", q);
  return p.toString();
}

/**
 * Filtra VS por texto en pregunta y posiciones (misma regla que el campo `q` en Explore).
 * Útil para el panel del dashboard y para mantener un solo criterio con el explorador.
 */
export function filterVsByTextQuery(open: VSData[], rawQuery: string): VSData[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return open;
  return open.filter(
    (v) =>
      v.question.toLowerCase().includes(q) ||
      v.creator_position.toLowerCase().includes(q) ||
      v.opponent_position.toLowerCase().includes(q)
  );
}

/**
 * Aplica categoría, apuesta mínima, búsqueda (`q`) y orden sobre una lista de `VSData`.
 * Misma lógica para VS on-chain abiertos y para cards de demostración (ids negativos).
 */
export function applyExploreFilters(
  open: VSData[],
  f: ExploreFilterState
): VSData[] {
  let list = open;
  if (f.cat !== "all") {
    list = list.filter((v) => v.category === f.cat);
  }
  if (f.minStake > 0) {
    list = list.filter((v) => v.stake_amount >= f.minStake);
  }
  list = filterVsByTextQuery(list, f.search);

  const sorted = [...list];
  if (f.sort === "highest") {
    sorted.sort((a, b) => b.stake_amount - a.stake_amount);
  } else if (f.sort === "expiring") {
    sorted.sort((a, b) => a.deadline - b.deadline);
  } else {
    sorted.sort((a, b) => b.id - a.id);
  }
  return sorted;
}
