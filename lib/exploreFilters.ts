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

const MIN_STAKE_OPTIONS = [0, 2, 5, 10] as const;
const SORT_OPTIONS: ExploreSort[] = ["newest", "highest", "expiring"];
const VALID_CATEGORY_IDS = new Set<string>(CATEGORIES.map((category) => category.id));

function isValidCategoryId(id: string) {
  return VALID_CATEGORY_IDS.has(id);
}

function isValidMinStake(value: number): value is (typeof MIN_STAKE_OPTIONS)[number] {
  return MIN_STAKE_OPTIONS.includes(value as (typeof MIN_STAKE_OPTIONS)[number]);
}

export function parseExploreSearchParams(
  searchParams: URLSearchParams
): ExploreFilterState {
  const catRaw = searchParams.get("cat") ?? "all";
  const cat = catRaw === "all" || isValidCategoryId(catRaw) ? catRaw : "all";

  const minParsed = Number(searchParams.get("min"));
  const minStake =
    Number.isFinite(minParsed) && isValidMinStake(minParsed) ? minParsed : 0;

  const sortRaw = (searchParams.get("sort") ?? "newest").toLowerCase();
  const sort = SORT_OPTIONS.includes(sortRaw as ExploreSort)
    ? (sortRaw as ExploreSort)
    : "newest";

  const search = searchParams.get("q") ?? "";

  return {
    cat,
    minStake,
    sort,
    search,
  };
}

export function serializeExploreFilters(filters: ExploreFilterState) {
  const params = new URLSearchParams();

  if (filters.cat !== "all") {
    params.set("cat", filters.cat);
  }
  if (filters.minStake !== 0) {
    params.set("min", String(filters.minStake));
  }
  if (filters.sort !== "newest") {
    params.set("sort", filters.sort);
  }

  const search = filters.search.trim();
  if (search) {
    params.set("q", search);
  }

  return params.toString();
}

export function applyExploreFilters(
  items: VSData[],
  filters: ExploreFilterState
) {
  let results = items;

  if (filters.cat !== "all") {
    results = results.filter((item) => item.category === filters.cat);
  }

  if (filters.minStake > 0) {
    results = results.filter((item) => item.stake_amount >= filters.minStake);
  }

  const query = filters.search.trim().toLowerCase();
  if (query) {
    results = results.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.creator_position.toLowerCase().includes(query) ||
        item.opponent_position.toLowerCase().includes(query)
    );
  }

  const sorted = [...results];
  if (filters.sort === "highest") {
    sorted.sort((a, b) => b.stake_amount - a.stake_amount);
  } else if (filters.sort === "expiring") {
    sorted.sort((a, b) => a.deadline - b.deadline);
  } else {
    sorted.sort((a, b) => b.id - a.id);
  }

  return sorted;
}
