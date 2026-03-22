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

function isValidMinStake(n: number): n is (typeof MIN_STAKE_OPTIONS)[number] {
  return MIN_STAKE_OPTIONS.includes(n as (typeof MIN_STAKE_OPTIONS)[number]);
}

/** Lee y valida query params (?cat=&min=&sort=&q=). Valores inválidos → defaults. */
export function parseExploreSearchParams(sp: URLSearchParams): ExploreFilterState {
  const catRaw = sp.get("cat") ?? "all";
  const cat =
    catRaw === "all" || isValidCategoryId(catRaw) ? catRaw : "all";

  const minParsed = Number(sp.get("min"));
  const minStake =
    Number.isFinite(minParsed) && isValidMinStake(minParsed) ? minParsed : 0;

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
  const q = f.search.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (v) =>
        v.question.toLowerCase().includes(q) ||
        v.creator_position.toLowerCase().includes(q) ||
        v.opponent_position.toLowerCase().includes(q)
    );
  }

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
