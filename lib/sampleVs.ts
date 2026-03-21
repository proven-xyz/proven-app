import type { VSData } from "@/lib/contract";
import { ZERO_ADDRESS } from "@/lib/constants";

/**
 * VS de demostración (ids negativos). La página /vs/[id] los resuelve sin llamar al contrato.
 * Categorías alineadas con filtros Explore: deportes (Sports), crypto, tech.
 */
export const SAMPLE_VS: Record<number, VSData> = {
  [-1]: {
    id: -1,
    creator: ZERO_ADDRESS,
    opponent: ZERO_ADDRESS,
    question: "BTC Price will break $100k before March 31",
    creator_position: "BTC breaks $100k",
    opponent_position: "BTC stays below $100k",
    resolution_url: "coingecko.com/en/coins/bitcoin",
    stake_amount: 200,
    deadline: Math.floor(Date.now() / 1000) + 86400 * 5,
    state: "open",
    winner: ZERO_ADDRESS,
    resolution_summary: "",
    created_at: Math.floor(Date.now() / 1000),
    category: "crypto",
  },
  [-2]: {
    id: -2,
    creator: ZERO_ADDRESS,
    opponent: ZERO_ADDRESS,
    question: "GPT-5 Announced by OpenAI before June",
    creator_position: "OpenAI announces GPT-5 before June",
    opponent_position: "No official announcement before June",
    resolution_url: "openai.com",
    stake_amount: 400,
    deadline: Math.floor(Date.now() / 1000) + 86400 * 12,
    state: "open",
    winner: ZERO_ADDRESS,
    resolution_summary: "",
    created_at: Math.floor(Date.now() / 1000),
    category: "tech",
  },
  [-3]: {
    id: -3,
    creator: ZERO_ADDRESS,
    opponent: ZERO_ADDRESS,
    question: "Lakers win the western conference",
    creator_position: "Lakers win the West",
    opponent_position: "Any other team wins the West",
    resolution_url: "nba.com",
    stake_amount: 140,
    deadline: Math.floor(Date.now() / 1000) + 86400 * 18,
    state: "open",
    winner: ZERO_ADDRESS,
    resolution_summary: "",
    created_at: Math.floor(Date.now() / 1000),
    category: "deportes",
  },
};

/** Orden en Explore: Sports → Crypto → Tech (deportes, crypto, tech). */
export const EXPLORE_SAMPLE_ORDER = [-3, -1, -2] as const;

export function getExploreSampleCards(): VSData[] {
  return EXPLORE_SAMPLE_ORDER.map((id) => SAMPLE_VS[id]).filter(Boolean);
}
