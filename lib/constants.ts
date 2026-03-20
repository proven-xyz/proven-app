export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const CATEGORIES = [
  { id: "deportes", label: "Deportes", color: "#22D3EE" },
  { id: "clima", label: "Clima", color: "#E879F9" },
  { id: "crypto", label: "Crypto", color: "#FBBF24" },
  { id: "cultura", label: "Cultura", color: "#10B981" },
  { id: "custom", label: "Custom", color: "#A1A1AA" },
] as const;

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

export function formatDeadline(ts: number): string {
  return new Date(ts * 1000).toLocaleString("es-AR", {
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

export function getShareUrl(vsId: number): string {
  if (typeof window !== "undefined") return `${window.location.origin}/vs/${vsId}`;
  return `/vs/${vsId}`;
}

export function getCategoryInfo(cat: string) {
  return CATEGORIES.find((c) => c.id === cat) || CATEGORIES[4];
}

export const STATE_LABELS: Record<string, string> = {
  open: "Abierto", accepted: "Aceptado", resolved: "PROVEN",
  cancelled: "Cancelado", won: "Ganaste", lost: "Perdiste", draw: "Empate",
};
