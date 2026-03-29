import type { CategoryId } from "@/lib/constants";

/** Categorías principales del explorador (ids de contrato + copia de mercado). */
export const EXPLORE_PRIMARY_CATEGORY_ROW: {
  id: CategoryId;
  labelKey: string;
}[] = [
  { id: "deportes", labelKey: "catSports" },
  { id: "crypto", labelKey: "catCrypto" },
  { id: "tech", labelKey: "catTech" },
  { id: "cultura", labelKey: "catEsports" },
  { id: "custom", labelKey: "catPolitics" },
];
