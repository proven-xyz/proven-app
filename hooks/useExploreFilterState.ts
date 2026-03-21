"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_EXPLORE_FILTERS,
  parseExploreSearchParams,
  serializeExploreFilters,
  type ExploreFilterState,
} from "@/lib/exploreFilters";

export function useExploreFilterState() {
  const searchParams = useSearchParams();
  const querySignature = searchParams.toString();

  const [filters, setFilters] = useState<ExploreFilterState>(() =>
    parseExploreSearchParams(new URLSearchParams(querySignature))
  );

  useEffect(() => {
    setFilters(parseExploreSearchParams(new URLSearchParams(querySignature)));
  }, [querySignature]);

  const commitSearchToUrl = useCallback((next: ExploreFilterState) => {
    if (typeof window === "undefined") {
      return;
    }

    const query = serializeExploreFilters(next);
    const search = query ? `?${query}` : "";
    const url = `${window.location.pathname}${search}`;
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const updateFilters = useCallback(
    (patch: Partial<ExploreFilterState>) => {
      setFilters((previous) => {
        const next = { ...previous, ...patch };
        commitSearchToUrl(next);
        return next;
      });
    },
    [commitSearchToUrl]
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_EXPLORE_FILTERS);
    if (typeof window !== "undefined") {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname
      );
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setFilters(
        parseExploreSearchParams(new URLSearchParams(window.location.search))
      );
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return { filters, updateFilters, resetFilters };
}
