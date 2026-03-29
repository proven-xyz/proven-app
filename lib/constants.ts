export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const MIN_STAKE = 2;

/**
 * Presets de plazo relativo (segundos) para crear VS.
 * Las etiquetas viven en `create.presets.*` (messages).
 */
export const DEADLINE_PRESET_IDS = [
  "1h",
  "24h",
  "3days",
  "1week",
  "1month",
] as const;

export type DeadlinePresetId = (typeof DEADLINE_PRESET_IDS)[number];

export const DEADLINE_PRESET_SECONDS: Record<DeadlinePresetId, number> = {
  "1h": 3600,
  "24h": 86400,
  "3days": 259200,
  "1week": 604800,
  "1month": 2592000,
};

/** Coincide con `theme.extend.colors.pv.emerald` — acento principal UI (chips, CTAs). */
export const PV_EMERALD_HEX = "#4edea3";

export const CATEGORIES = [
  { id: "deportes", label: "Deportes", color: "#22D3EE" },
  { id: "clima", label: "Clima", color: "#E879F9" },
  { id: "crypto", label: "Crypto", color: "#FBBF24" },
  { id: "tech", label: "Tech", color: "#818CF8" },
  { id: "cultura", label: "Cultura", color: "#10B981" },
  { id: "custom", label: "Custom", color: "#A1A1AA" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

type CategoryGuidance = {
  sourceExamples: string[];
  sourceHint: string;
  settlementTemplate: string;
  questionHint: string;
};

export const CATEGORY_GUIDANCE: Record<CategoryId, CategoryGuidance> = {
  deportes: {
    sourceExamples: [
      "espn.com",
      "bbc.com/sport",
      "nba.com",
    ],
    sourceHint: "Use the official match, league, or scoreboard page for the event you want to settle.",
    settlementTemplate:
      "Resolve this against the official final result of the linked event. State whether extra time, penalties, or overtime count.",
    questionHint: "Include the teams, competition, and timeframe in the question itself.",
  },
  clima: {
    sourceExamples: [
      "weather.com",
      "weather.gov",
      "open-meteo.com",
    ],
    sourceHint: "Use a weather source that clearly names the location and date being measured.",
    settlementTemplate:
      "Resolve this using the weather reported for the named location and date on the linked source. Use the exact precipitation or temperature condition written here.",
    questionHint: "Name the city or region and the exact day being judged.",
  },
  crypto: {
    sourceExamples: [
      "coingecko.com",
      "coinmarketcap.com",
      "binance.com",
    ],
    sourceHint: "Use a price page that will still show the asset and quoted value at settlement time.",
    settlementTemplate:
      "Resolve this using the visible spot price on the linked source at the deadline time. Apply any threshold or line exactly as written.",
    questionHint: "Name the asset, threshold, and deadline explicitly.",
  },
  tech: {
    sourceExamples: [
      "openai.com",
      "blog.google",
      "apple.com/newsroom",
    ],
    sourceHint:
      "Use an official product blog, press release, or changelog that will still reflect the announced fact at settlement.",
    settlementTemplate:
      "Resolve this only from the linked official source at the deadline. Treat “announced” as a public, attributable statement from the named party.",
    questionHint: "Name the product, company, and the concrete milestone or date window being judged.",
  },
  cultura: {
    sourceExamples: [
      "grammy.com",
      "billboard.com",
      "imdb.com",
    ],
    sourceHint: "Prefer the official publication, awards page, or primary entertainment source behind the claim.",
    settlementTemplate:
      "Resolve this only from the linked official or authoritative source. Do not infer beyond the exact published result.",
    questionHint: "Anchor the claim to a concrete release, award, ranking, or publication event.",
  },
  custom: {
    sourceExamples: [
      "official source",
      "newsroom or issuer",
      "event results page",
    ],
    sourceHint:
      "Use the official match, league, or scoreboard page for the exact event you want to settle.",
    settlementTemplate:
      "Resolve this exactly as written using the linked source only. If the wording or source leaves room for interpretation, mark it unresolvable.",
    questionHint: "",
  },
};

export const PREFILLS: Record<string, { q: string; a: string; b: string; u: string }> = {
  deportes: {
    q: "¿Argentina le gana a Brasil hoy?",
    a: "Argentina gana",
    b: "Brasil gana o empata",
    u: "https://bbc.com/sport/football/scores-fixtures/2026-03-20",
  },
  clima: {
    q: "¿Llueve mañana en Buenos Aires?",
    a: "Sí llueve",
    b: "No llueve",
    u: "https://weather.com",
  },
  crypto: {
    q: "¿BTC supera $100k esta semana?",
    a: "BTC supera $100k",
    b: "BTC NO supera $100k",
    u: "https://coingecko.com/en/coins/bitcoin",
  },
  tech: {
    q: "¿GPT-5 se anuncia antes de junio?",
    a: "OpenAI anuncia GPT-5 antes de junio",
    b: "Sin anuncio oficial antes de junio",
    u: "https://openai.com",
  },
  cultura: {
    q: "¿Shakira tiene más Grammys que Bad Bunny?",
    a: "Shakira tiene más",
    b: "Bad Bunny tiene más",
    u: "https://grammy.com",
  },
};

export function shortenAddress(a: string, chars = 4): string {
  if (!a) return "";
  return `${a.slice(0, chars + 2)}…${a.slice(-chars)}`;
}

export function formatDeadline(ts: number, locale = "es"): string {
  const loc = locale === "en" ? "en-US" : "es-AR";
  return new Date(ts * 1000).toLocaleString(loc, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function getTimeRemaining(deadline: number) {
  const now = Math.floor(Date.now() / 1000);
  const t = Math.max(0, deadline - now);
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    expired: t <= 0,
    text: t <= 0 ? "00:00:00" : `${d > 0 ? d + "d " : ""}${pad(h)}:${pad(m)}:${pad(s)}`,
    total: t,
  };
}

export function getShareUrl(vsId: number, inviteKey = ""): string {
  const path = inviteKey ? `/vs/${vsId}?invite=${encodeURIComponent(inviteKey)}` : `/vs/${vsId}`;
  if (typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}

export function normalizeResolutionSource(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  try {
    if (/^https?:\/\//i.test(normalized)) {
      return new URL(normalized).toString();
    }
    return new URL(`https://${normalized}`).toString();
  } catch {
    return "";
  }
}

export function getCategoryInfo(cat: string) {
  return (
    CATEGORIES.find((c) => c.id === cat) ??
    CATEGORIES.find((c) => c.id === "custom")!
  );
}

export const STATE_LABELS: Record<string, string> = {
  open: "Abierto", accepted: "Aceptado", resolved: "PROVEN",
  cancelled: "Cancelado", won: "Ganaste", lost: "Perdiste", draw: "Empate",
};
