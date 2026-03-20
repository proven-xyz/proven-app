import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════
   PROVEN — The Truth Machine
   Cyan challenger · Fuchsia opponent · Emerald truth
   ═══════════════════════════════════════════════════════════ */

const Z = "0x0000000000000000000000000000000000000000";
const WA = "0xA1b2C3d4E5f6789012345678901234567890AbCd";
const WB = "0xF9e8D7c6B5a43210987654321098765432109876";

function dn(a) {
  if (!a) return "?";
  if (a.toLowerCase() === WA.toLowerCase()) return "vos";
  if (a.toLowerCase() === WB.toLowerCase()) return "nico";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

// ═══ Palette ═══
const C = {
  bg: "#09090B", sf: "#18181B", sf2: "#27272A", bd: "#3F3F46",
  t1: "#FAFAFA", t2: "#A1A1AA",
  cyan: "#22D3EE", cyanDim: "rgba(34,211,238,", 
  fuch: "#E879F9", fuchDim: "rgba(232,121,249,",
  em: "#10B981", emDim: "rgba(16,185,129,",
  gold: "#FBBF24",
  red: "#EF4444",
};

const SEED = [
  { id: 1, cr: WA, op: WB, q: "¿Argentina le gana a Brasil hoy?", cp: "Argentina gana", opp: "Brasil gana o empata", url: "bbc.com/sport/football", stake: 5, dl: Math.floor(Date.now() / 1000) - 60, st: "accepted", win: Z, sum: "", src: [], cat: "deportes" },
  { id: 2, cr: WA, op: Z, q: "¿Llueve mañana en Buenos Aires?", cp: "Sí llueve", opp: "No llueve", url: "weather.com", stake: 2, dl: Math.floor(Date.now() / 1000) + 86400, st: "open", win: Z, sum: "", src: [], cat: "clima" },
  { id: 3, cr: WB, op: WA, q: "¿BTC supera $110k antes del viernes?", cp: "BTC supera $110k", opp: "BTC NO supera $110k", url: "coingecko.com", stake: 10, dl: Math.floor(Date.now() / 1000) - 7200, st: "resolved", win: WB, sum: "Bitcoin cerró en $108,450 — por debajo de $110k.", src: ["CoinGecko", "Binance", "CoinMarketCap"], cat: "crypto" },
  { id: 4, cr: WB, op: Z, q: "¿Boca le gana a River el domingo?", cp: "Boca gana", opp: "River gana o empata", url: "espn.com.ar", stake: 10, dl: Math.floor(Date.now() / 1000) + 172800, st: "open", win: Z, sum: "", src: [], cat: "deportes" },
  { id: 5, cr: WB, op: Z, q: "¿Shakira tiene más Grammys que Bad Bunny?", cp: "Shakira tiene más", opp: "Bad Bunny tiene más", url: "grammy.com", stake: 5, dl: Math.floor(Date.now() / 1000) + 43200, st: "open", win: Z, sum: "", src: [], cat: "cultura" },
  { id: 6, cr: WA, op: Z, q: "¿ETH supera $4k esta semana?", cp: "ETH supera $4k", opp: "ETH NO supera $4k", url: "coingecko.com/en/coins/ethereum", stake: 25, dl: Math.floor(Date.now() / 1000) + 259200, st: "open", win: Z, sum: "", src: [], cat: "crypto" },
  { id: 7, cr: WB, op: Z, q: "¿La temperatura pasa de 35°C mañana en Córdoba?", cp: "Más de 35°C", opp: "Menos de 35°C", url: "weather.com", stake: 3, dl: Math.floor(Date.now() / 1000) + 64800, st: "open", win: Z, sum: "", src: [], cat: "clima" },
  { id: 8, cr: WA, op: Z, q: "¿Racing le gana a Independiente?", cp: "Racing gana", opp: "Independiente gana o empata", url: "espn.com.ar", stake: 5, dl: Math.floor(Date.now() / 1000) + 86400, st: "open", win: Z, sum: "", src: [], cat: "deportes" },
];

const CATS_MAP = {
  deportes: { label: "Deportes", color: C.cyan },
  clima: { label: "Clima", color: C.fuch },
  crypto: { label: "Crypto", color: C.gold },
  cultura: { label: "Cultura", color: C.em },
};

function useCD(dl) {
  const [t, sT] = useState(0);
  useEffect(() => { const k = () => sT(Math.max(0, dl - Math.floor(Date.now() / 1000))); k(); const i = setInterval(k, 1000); return () => clearInterval(i); }, [dl]);
  const p = (n) => String(n).padStart(2, "0");
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return { exp: t <= 0, txt: t <= 0 ? "00:00:00" : `${d > 0 ? d + "d " : ""}${p(h)}:${p(m)}:${p(s)}` };
}

// ═══ MAIN ═══
export default function App() {
  const [pg, sPg] = useState("home");
  const [w, sW] = useState(null);
  const [ds, sDs] = useState(SEED);
  const [sid, sSid] = useState(null);
  const [toast, sToast] = useState(null);
  const [conf, sConf] = useState(false);

  const fl = (m, err) => { sToast({ m, err }); setTimeout(() => sToast(null), 3000); };
  const go = (p, id) => { sPg(p); if (id !== undefined) sSid(id); window.scrollTo({ top: 0 }); };
  const conn = () => { sW(WA); fl("Wallet conectada"); };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background: #09090B; color: #FAFAFA; -webkit-font-smoothing: antialiased; }
        ::selection { background: rgba(16,185,129,0.25); }
        input, textarea { outline: none; font-family: 'Inter', sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes confDrop { 0% { opacity:1; transform:translateY(0) rotate(0deg) } 100% { opacity:0; transform:translateY(100vh) rotate(600deg) } }
        @keyframes stampIn { 0% { opacity:0; transform:scale(2.5) rotate(-12deg) } 50% { opacity:1; transform:scale(0.95) rotate(-12deg) } 100% { opacity:1; transform:scale(1) rotate(-12deg) } }
        @keyframes pulseEm { 0%,100% { box-shadow:0 0 30px rgba(16,185,129,0.08) } 50% { box-shadow:0 0 60px rgba(16,185,129,0.2) } }
        @keyframes typeIn { from { width:0 } to { width:100% } }
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes countRoll { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .fu { animation: fadeUp 0.5s ease-out both; }
        .d1 { animation-delay: 0.07s } .d2 { animation-delay: 0.14s } .d3 { animation-delay: 0.21s } .d4 { animation-delay: 0.28s } .d5 { animation-delay: 0.35s }
        ::-webkit-scrollbar { width: 5px } ::-webkit-scrollbar-thumb { background: #3F3F46; border-radius: 3px }
      `}</style>

      {/* Confetti */}
      {conf && <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }}>
        {Array.from({ length: 50 }).map((_, i) => {
          const cols = [C.em, C.cyan, C.fuch, C.gold, C.t1];
          return <div key={i} style={{ position: "absolute", left: `${Math.random() * 100}%`, top: "-3%", width: 5 + Math.random() * 10, height: 5 + Math.random() * 10, borderRadius: Math.random() > 0.5 ? "50%" : "2px", background: cols[i % cols.length], animation: `confDrop ${1.5 + Math.random() * 1.5}s ${Math.random() * 0.5}s ease-in forwards`, opacity: 0 }} />;
        })}
      </div>}

      {/* Toast */}
      {toast && <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 1000, padding: "12px 24px", borderRadius: 16, fontSize: 14, fontWeight: 600, background: toast.err ? "rgba(239,68,68,0.12)" : `${C.emDim}0.1)`, border: `1px solid ${toast.err ? "rgba(239,68,68,0.25)" : `${C.emDim}0.25)`}`, color: toast.err ? C.red : C.em, animation: "fadeUp 0.2s ease-out", boxShadow: "0 16px 48px rgba(0,0,0,0.6)", backdropFilter: "blur(16px)" }}>{toast.m}</div>}

      {/* ─── HEADER ─── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: `1px solid ${C.sf}`, background: "rgba(9,9,11,0.92)", backdropFilter: "blur(24px)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div onClick={() => go("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 18, letterSpacing: "-0.03em" }}>
              PROVEN<span style={{ color: C.em }}>.</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {w && <>
              <Chip onClick={() => go("create")} glow="cyan">+ Desafiar</Chip>
              <Chip onClick={() => go("explore")}>Explorar</Chip>
              <Chip onClick={() => go("dashboard")}>Mis VS</Chip>
            </>}
            {w ? (
              <Chip onClick={() => sW(null)} mono glow="em">{WA.slice(0, 6)}…{WA.slice(-4)}</Chip>
            ) : (
              <button onClick={conn} style={{ padding: "8px 18px", borderRadius: 12, border: "none", background: C.t1, color: C.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter'" }}>Conectar</button>
            )}
          </div>
        </div>
      </header>

      {/* ─── CONTENT ─── */}
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 100px" }}>
        {pg === "home" && <Home w={w} conn={conn} go={go} ds={ds} />}
        {pg === "create" && <Create w={w} conn={conn} ds={ds} sDs={sDs} go={go} fl={fl} />}
        {pg === "duel" && <Detail w={w} conn={conn} ds={ds} sDs={sDs} id={sid} go={go} fl={fl} sConf={sConf} />}
        {pg === "explore" && <Explore w={w} conn={conn} ds={ds} go={go} />}
        {pg === "dashboard" && <Dash w={w} conn={conn} ds={ds} go={go} />}
      </main>
    </div>
  );
}

/* ═══ Shared Components ═══ */

function Chip({ children, onClick, mono, glow }) {
  const glowColor = glow === "cyan" ? C.cyan : glow === "em" ? C.em : glow === "fuch" ? C.fuch : null;
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 10,
      border: `1px solid ${glowColor ? glowColor + "30" : C.bd}`,
      background: glowColor ? glowColor + "08" : "transparent",
      color: glowColor || C.t2,
      fontSize: mono ? 11 : 13, fontWeight: 600, cursor: "pointer",
      fontFamily: mono ? "'Space Mono'" : "'Inter'",
      transition: "all 0.15s",
    }}>{children}</button>
  );
}

function GlassCard({ children, style, glowSide, noPad }) {
  return (
    <div style={{
      background: C.sf, borderRadius: 24,
      border: `1px solid ${C.sf2}`,
      position: "relative", overflow: "hidden",
      ...style,
    }}>
      {glowSide === "both" && <>
        <div style={{ position: "absolute", top: 0, left: 0, width: "50%", height: "100%", background: `radial-gradient(ellipse at 0% 40%, ${C.cyanDim}0.07), transparent 65%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", background: `radial-gradient(ellipse at 100% 40%, ${C.fuchDim}0.07), transparent 65%)`, pointerEvents: "none" }} />
      </>}
      {glowSide === "cyan" && <div style={{ position: "absolute", top: 0, left: 0, width: "60%", height: "100%", background: `radial-gradient(ellipse at 0% 50%, ${C.cyanDim}0.06), transparent 60%)`, pointerEvents: "none" }} />}
      {glowSide === "fuch" && <div style={{ position: "absolute", top: 0, right: 0, width: "60%", height: "100%", background: `radial-gradient(ellipse at 100% 50%, ${C.fuchDim}0.06), transparent 60%)`, pointerEvents: "none" }} />}
      <div style={{ position: "relative", padding: noPad ? 0 : "28px 24px" }}>{children}</div>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = "white", style: xs = {} }) {
  const vs = {
    white: { background: C.t1, color: C.bg },
    cyan: { background: C.cyan, color: C.bg },
    fuch: { background: C.fuch, color: "#fff" },
    em: { background: C.em, color: C.bg },
    ghost: { background: "transparent", color: C.t2, border: `1px solid ${C.bd}` },
    danger: { background: "rgba(239,68,68,0.05)", color: C.red, border: "1px solid rgba(239,68,68,0.15)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "18px 24px", borderRadius: 16, border: "none", cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      opacity: disabled ? 0.4 : 1, transition: "all 0.15s",
      ...vs[variant], ...xs,
    }}>{children}</button>
  );
}

function Av({ side, s = 48 }) {
  const isCr = side === "cr";
  const c = isCr ? C.cyan : C.fuch;
  return (
    <div style={{ width: s, height: s, borderRadius: s / 2, background: c + "12", border: `2.5px solid ${c}50`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: s * 0.35, height: s * 0.35, borderRadius: "50%", background: c }} />
    </div>
  );
}

function Badge({ st, large }) {
  const m = {
    open: [C.cyan, "Abierto"], accepted: [C.fuch, "Aceptado"], resolving: [C.em, "Verificando"],
    resolved: [C.em, "PROVEN"], won: [C.em, "Ganaste"], lost: [C.red, "Perdiste"],
    draw: [C.t2, "Empate"], cancelled: ["#6B7280", "Cancelado"],
  };
  const [c, l] = m[st] || m.open;
  return (
    <span style={{
      display: "inline-block", padding: large ? "5px 14px" : "4px 11px", borderRadius: 20,
      fontSize: large ? 11 : 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
      background: c + "12", color: c, border: `1px solid ${c}25`,
    }}>{l}</span>
  );
}

function Pool({ amt, large }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: large ? "12px 24px" : "8px 16px", borderRadius: 14,
      background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.12)",
      fontFamily: "'Space Mono'", fontSize: large ? 18 : 14, fontWeight: 700, color: C.gold,
    }}>Hay ${amt} en juego</div>
  );
}

function Sp({ s = 18, c = "#09090B" }) {
  return <div style={{ width: s, height: s, border: `2.5px solid transparent`, borderTopColor: c, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />;
}

function Lbl({ children }) {
  return <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: C.t2, marginBottom: 8 }}>{children}</label>;
}

/* ═══════════════════════════════════════════════════
   HOME
   ═══════════════════════════════════════════════════ */

function Home({ w, conn, go, ds }) {
  const s = SEED[0];
  return (
    <div className="fu">
      {/* Hero */}
      <GlassCard glowSide="both" style={{ marginBottom: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div className="fu d1" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: C.em, marginBottom: 24 }}>
            Último VS resuelto
          </div>

          <h1 className="fu d2" style={{ fontFamily: "'Space Grotesk'", fontSize: "clamp(32px, 8vw, 52px)", fontWeight: 700, lineHeight: 0.9, letterSpacing: "-0.04em", marginBottom: 28 }}>
            {s.q}
          </h1>

          <div className="fu d3" style={{ marginBottom: 32 }}>
            <Pool amt={s.stake * 2} large />
          </div>

          {/* VS strip */}
          <div className="fu d4" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <Av side="cr" s={56} />
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>{dn(s.cr)}</div>
              <div style={{ fontSize: 12, color: C.cyan, marginTop: 3 }}>{s.cp}</div>
            </div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 24, fontWeight: 700, color: C.sf2 }}>VS</div>
            <div style={{ textAlign: "center" }}>
              <Av side="op" s={56} />
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>{dn(s.op)}</div>
              <div style={{ fontSize: 12, color: C.fuch, marginTop: 3 }}>{s.opp}</div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* CTAs */}
      <div className="fu d4" style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
        <Btn onClick={() => { if (!w) conn(); go("create"); }}>Desafiar a alguien</Btn>
        <Btn variant="ghost" onClick={() => { if (!w) conn(); go("dashboard"); }}>Tengo un link</Btn>
      </div>

      {/* Differentiator */}
      <div className="fu d5" style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 14 }}>
          <div style={{ height: 1, width: 40, background: C.sf2 }} />
          <div style={{ width: 6, height: 6, borderRadius: 3, background: C.em, boxShadow: `0 0 10px ${C.em}60` }} />
          <div style={{ height: 1, width: 40, background: C.sf2 }} />
        </div>
        <p style={{ fontSize: 15, color: C.t2, lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
          <span style={{ color: C.t1, fontWeight: 600 }}>Sin árbitros.</span>{" "}
          <span style={{ color: C.t1, fontWeight: 600 }}>Sin discusiones.</span>{" "}
          <span style={{ color: C.t1, fontWeight: 600 }}>Sin esperar.</span>
          <br />
          La IA busca las pruebas. <span style={{ color: C.em, fontWeight: 600 }}>PROVEN</span> decide. El ganador cobra al instante.
        </p>
      </div>

      {/* Steps */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: C.t2, textAlign: "center", marginBottom: 20 }}>¿Cómo funciona?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            { l: "Desafiá", s: "tu apuesta", c: C.cyan },
            { l: "Mandá", s: "el link", c: C.fuch },
            { l: "Acepta", s: "tu rival", c: C.gold },
            { l: "PROVEN", s: "decide", c: C.em },
          ].map(({ l, s: sub, c }, i) => (
            <GlassCard key={i} style={{ textAlign: "center", padding: 0 }}>
              <div style={{ padding: "20px 8px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: c + "10", border: `1px solid ${c}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: c, boxShadow: `0 0 12px ${c}60` }} />
                </div>
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 700, color: c }}>{l}</div>
                <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>{sub}</div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* ═══ OPEN VS — Preview (max 2) ═══ */}
      {(() => {
        const openDuels = ds.filter((d) => d.st === "open");
        if (openDuels.length === 0) return null;
        const preview = openDuels.slice(0, 2);
        return (
          <div style={{ marginTop: 48 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: C.cyan, boxShadow: `0 0 8px ${C.cyan}60` }} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: C.cyan }}>
                  VS Abiertos
                </span>
              </div>
              <span style={{ fontSize: 11, color: C.t2 }}>{openDuels.length} esperando rival</span>
            </div>
            {preview.map((d) => (
              <OpenVSCard key={d.id} d={d} w={w} conn={conn} go={go} />
            ))}
            {openDuels.length > 2 && (
              <button
                onClick={() => go("explore")}
                style={{
                  width: "100%", padding: "14px", borderRadius: 14,
                  border: `1px solid ${C.cyan}20`, background: `${C.cyanDim}0.04)`,
                  color: C.cyan, fontFamily: "'Space Grotesk'",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  marginTop: 4, transition: "all 0.15s",
                }}
              >
                Ver todos los VS abiertos ({openDuels.length})
              </button>
            )}
          </div>
        );
      })()}

      {/* ═══ Recently Proven ═══ */}
      {(() => {
        const resolved = ds.filter((d) => d.st === "resolved");
        if (resolved.length === 0) return null;
        return (
          <div style={{ marginTop: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: C.em, textAlign: "center", marginBottom: 16 }}>
              Recientemente proven
            </div>
            {resolved.map((d) => (
              <div
                key={d.id}
                onClick={() => go("duel", d.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", borderRadius: 14,
                  background: C.sf, border: `1px solid ${C.sf2}`,
                  marginBottom: 8, cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 14, background: C.em + "15", border: `1.5px solid ${C.em}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: C.em }} />
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{dn(d.win)}</span>
                    <span style={{ fontSize: 13, color: C.t2 }}> ganó: </span>
                    <span style={{ fontSize: 13, color: C.em, fontWeight: 500 }}>"{d.q.length > 30 ? d.q.slice(0, 30) + "…" : d.q}"</span>
                  </div>
                </div>
                <span style={{ fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700, color: C.gold }}>+${d.stake * 2}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CREATE
   ═══════════════════════════════════════════════════ */

function Create({ w, conn, ds, sDs, go, fl }) {
  const [q, sQ] = useState("");
  const [cp, sCP] = useState("");
  const [op, sOP] = useState("");
  const [url, sU] = useState("");
  const [dl, sDl] = useState("");
  const [sk, sSk] = useState(5);
  const [ld, sLd] = useState(false);
  const [done, sDone] = useState(null);
  const [cpd, sCpd] = useState(false);

  const pf = {
    deportes: { q: "¿Argentina le gana a Brasil hoy?", a: "Argentina gana", b: "Brasil gana o empata", u: "bbc.com/sport/football/scores-fixtures/2026-03-20" },
    clima: { q: "¿Llueve mañana en Buenos Aires?", a: "Sí llueve", b: "No llueve", u: "weather.com" },
    crypto: { q: "¿BTC supera $100k esta semana?", a: "BTC supera $100k", b: "BTC NO supera $100k", u: "coingecko.com/en/coins/bitcoin" },
    cultura: { q: "¿Shakira tiene más Grammys que Bad Bunny?", a: "Shakira tiene más", b: "Bad Bunny tiene más", u: "grammy.com" },
  };

  const fill = (k) => { const p = pf[k]; if (p) { sQ(p.q); sCP(p.a); sOP(p.b); sU(p.u); } };

  const sub = () => {
    if (!q || !cp || !op) { fl("Completá los campos", true); return; }
    sLd(true);
    setTimeout(() => {
      const d = { id: ds.length + 1, cr: w, op: Z, q, cp, opp: op, url: url || "google.com", stake: sk, dl: dl ? Math.floor(new Date(dl).getTime() / 1000) : Math.floor(Date.now() / 1000) + 7200, st: "open", win: Z, sum: "", src: [] };
      sDs((p) => [...p, d]);
      sDone(d);
      sLd(false);
      fl("VS creado y fondeado");
    }, 1800);
  };

  const inp = { width: "100%", padding: "14px 18px", borderRadius: 14, background: C.sf, border: `1px solid ${C.sf2}`, color: C.t1, fontSize: 15 };

  if (done) {
    return (
      <div className="fu" style={{ textAlign: "center", paddingTop: 24 }}>
        <div style={{ fontFamily: "'Space Grotesk'", fontSize: 48, fontWeight: 700, color: C.em, marginBottom: 16 }}>PROVEN.</div>
        <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>VS creado y fondeado</h2>
        <p style={{ color: C.t2, marginBottom: 28 }}>Mandá este link a tu rival.</p>
        <GlassCard style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <input readOnly value={`proven.app/vs/${done.id}`} style={{ ...inp, flex: 1, fontFamily: "'Space Mono'", fontSize: 12 }} />
            <button onClick={() => { sCpd(true); fl("Link copiado"); setTimeout(() => sCpd(false), 2000); }} style={{ padding: "14px 20px", borderRadius: 14, border: "none", background: C.t1, color: C.bg, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              {cpd ? "Listo" : "Copiar"}
            </button>
          </div>
        </GlassCard>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 }}>
          {["WhatsApp", "Telegram"].map((s) => <Chip key={s} onClick={() => {}}>{s}</Chip>)}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Btn onClick={() => go("duel", done.id)} style={{ width: "auto", padding: "14px 28px", fontSize: 15 }}>Ver VS</Btn>
          <Btn variant="ghost" onClick={() => { sDone(null); sQ(""); sCP(""); sOP(""); sU(""); }} style={{ width: "auto", padding: "14px 28px", fontSize: 15 }}>Crear otro</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="fu">
      <button onClick={() => go("home")} style={{ background: "none", border: "none", cursor: "pointer", color: C.t2, fontSize: 14, marginBottom: 20, fontFamily: "'Inter'" }}>← Volver</button>

      {/* The massive question input */}
      <div style={{ marginBottom: 28 }}>
        <textarea
          rows={3}
          style={{
            width: "100%", padding: "24px 0", borderRadius: 0, background: "transparent",
            border: "none", borderBottom: `2px solid ${C.sf2}`, color: C.t1,
            fontSize: "clamp(24px, 6vw, 36px)", fontFamily: "'Space Grotesk'", fontWeight: 700,
            lineHeight: 1.05, letterSpacing: "-0.03em", resize: "none",
          }}
          placeholder="¿Qué va a pasar?"
          value={q}
          onChange={(e) => sQ(e.target.value)}
        />
      </div>

      {/* Category chips */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 24 }}>
        {[
          { k: "deportes", l: "Deportes", c: C.cyan },
          { k: "clima", l: "Clima", c: C.fuch },
          { k: "crypto", l: "Crypto", c: C.gold },
          { k: "cultura", l: "Cultura", c: C.em },
        ].map(({ k, l, c }) => (
          <button key={k} onClick={() => fill(k)} style={{
            padding: "8px 16px", borderRadius: 12, border: `1px solid ${c}25`, background: c + "08",
            color: c, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Inter'",
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Positions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Lbl><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: C.cyan, marginRight: 8, verticalAlign: "middle" }} />Yo apuesto</Lbl>
            <input style={inp} placeholder="Argentina gana" value={cp} onChange={(e) => sCP(e.target.value)} />
          </div>
          <div>
            <Lbl><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: C.fuch, marginRight: 8, verticalAlign: "middle" }} />Rival apuesta</Lbl>
            <input style={inp} placeholder="Brasil gana" value={op} onChange={(e) => sOP(e.target.value)} />
          </div>
        </div>

        {/* Stake chips */}
        <div>
          <Lbl>Subí la apuesta</Lbl>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[2, 5, 10, 25].map((v) => (
              <button key={v} onClick={() => sSk(v)} style={{
                padding: "16px 0", borderRadius: 14,
                border: `2px solid ${sk === v ? C.cyan : C.sf2}`,
                background: sk === v ? C.cyan + "10" : C.sf,
                color: sk === v ? C.cyan : C.t2,
                fontFamily: "'Space Mono'", fontSize: 17, fontWeight: 700,
                cursor: "pointer", transition: "all 0.15s",
                boxShadow: sk === v ? `0 0 15px ${C.cyanDim}0.15)` : "none",
              }}>${v}</button>
            ))}
          </div>
        </div>

        <div>
          <Lbl>Fuente</Lbl>
          <input style={{ ...inp, fontFamily: "'Space Mono'", fontSize: 12 }} placeholder="espn.com, weather.com..." value={url} onChange={(e) => sU(e.target.value)} />
        </div>
        <div>
          <Lbl>Deadline</Lbl>
          <input type="datetime-local" style={inp} value={dl} onChange={(e) => sDl(e.target.value)} />
        </div>

        <Btn onClick={sub} disabled={ld} variant="cyan">
          {ld ? <><Sp c="#09090B" /> Fondeando...</> : `Crear y Fondear $${sk}`}
        </Btn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DUEL DETAIL / RESOLUTION
   ═══════════════════════════════════════════════════ */

/* ═══ Reusable Open VS Card ═══ */

function OpenVSCard({ d, w, conn, go, showCat = false }) {
  const catInfo = CATS_MAP[d.cat];
  return (
    <div
      onClick={() => { if (!w) conn(); go("duel", d.id); }}
      style={{
        background: C.sf,
        border: `1px solid ${C.sf2}`,
        borderRadius: 20,
        padding: 20,
        marginBottom: 10,
        cursor: "pointer",
        transition: "all 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: "40%", height: "100%", background: `radial-gradient(ellipse at 0% 50%, ${C.cyanDim}0.05), transparent 65%)`, pointerEvents: "none" }} />

      <div style={{ position: "relative" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Av side="cr" s={28} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>@{dn(d.cr)}</span>
            <span style={{ fontSize: 12, color: C.t2 }}>desafía</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {showCat && catInfo && (
              <span style={{
                padding: "3px 8px", borderRadius: 8,
                background: catInfo.color + "10", border: `1px solid ${catInfo.color}20`,
                fontSize: 10, fontWeight: 700, color: catInfo.color,
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                {catInfo.label}
              </span>
            )}
            <span style={{ fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700, color: C.gold }}>${d.stake * 2}</span>
          </div>
        </div>

        {/* Question */}
        <div style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 700, lineHeight: 1.15, marginBottom: 14 }}>
          {d.q}
        </div>

        {/* Positions strip */}
        <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.sf2}`, marginBottom: 14 }}>
          <div style={{ flex: 1, padding: "8px 12px", background: `${C.cyanDim}0.03)` }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.cyan + "70" }}>Creador</div>
            <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{d.cp}</div>
          </div>
          <div style={{ width: 1, background: C.sf2 }} />
          <div style={{ flex: 1, padding: "8px 12px", background: `${C.fuchDim}0.03)` }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.fuch + "70" }}>Rival</div>
            <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2, color: C.t2, fontStyle: "italic" }}>Esperando...</div>
          </div>
        </div>

        {/* Accept CTA */}
        <div style={{
          width: "100%", padding: "12px", borderRadius: 12,
          background: C.fuch + "10", border: `1px solid ${C.fuch}25`,
          textAlign: "center", fontFamily: "'Space Grotesk'",
          fontSize: 14, fontWeight: 700, color: C.fuch,
        }}>
          Aceptar y Poner ${d.stake}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   EXPLORE — VS Abiertos with filters
   ═══════════════════════════════════════════════════ */

function Explore({ w, conn, ds, go }) {
  const [cat, setCat] = useState("all");
  const [minStake, setMinStake] = useState(0);
  const [sort, setSort] = useState("newest");

  const allOpen = ds.filter((d) => d.st === "open");

  // Apply filters
  let filtered = allOpen;
  if (cat !== "all") {
    filtered = filtered.filter((d) => d.cat === cat);
  }
  if (minStake > 0) {
    filtered = filtered.filter((d) => d.stake >= minStake);
  }

  // Sort
  if (sort === "highest") {
    filtered = [...filtered].sort((a, b) => b.stake - a.stake);
  } else if (sort === "expiring") {
    filtered = [...filtered].sort((a, b) => a.dl - b.dl);
  } else {
    filtered = [...filtered].sort((a, b) => b.id - a.id);
  }

  return (
    <div className="fu">
      <button onClick={() => go("home")} style={{ background: "none", border: "none", cursor: "pointer", color: C.t2, fontSize: 14, marginBottom: 20, fontFamily: "'Inter'" }}>
        ← Volver
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 24, fontWeight: 700 }}>
          VS Abiertos
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: C.cyan, boxShadow: `0 0 8px ${C.cyan}60` }} />
          <span style={{ fontFamily: "'Space Mono'", fontSize: 12, color: C.t2 }}>{allOpen.length} disponibles</span>
        </div>
      </div>
      <p style={{ color: C.t2, fontSize: 14, marginBottom: 24 }}>
        Aceptá el VS de alguien más. Elegí tu pelea.
      </p>

      {/* ── Filters ── */}
      <GlassCard style={{ marginBottom: 24 }} noPad>
        <div style={{ padding: "20px 20px 16px" }}>
          {/* Category filter */}
          <div style={{ marginBottom: 16 }}>
            <Lbl>Categoría</Lbl>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <FilterChip active={cat === "all"} color={C.t1} onClick={() => setCat("all")}>Todos</FilterChip>
              {Object.entries(CATS_MAP).map(([k, v]) => (
                <FilterChip key={k} active={cat === k} color={v.color} onClick={() => setCat(k)}>
                  {v.label}
                </FilterChip>
              ))}
            </div>
          </div>

          {/* Min stake */}
          <div style={{ marginBottom: 16 }}>
            <Lbl>Apuesta mínima</Lbl>
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 2, 5, 10].map((v) => (
                <FilterChip key={v} active={minStake === v} color={C.gold} onClick={() => setMinStake(v)}>
                  {v === 0 ? "Cualquiera" : `$${v}+`}
                </FilterChip>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <Lbl>Ordenar</Lbl>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { k: "newest", l: "Más nuevos" },
                { k: "highest", l: "Mayor apuesta" },
                { k: "expiring", l: "Por vencer" },
              ].map(({ k, l }) => (
                <FilterChip key={k} active={sort === k} color={C.cyan} onClick={() => setSort(k)}>
                  {l}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ── Results ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: C.t2 }}>{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 700, color: C.t2, marginBottom: 10 }}>
            No hay VS con estos filtros
          </div>
          <p style={{ fontSize: 13, color: C.t2, marginBottom: 20 }}>Probá cambiando los filtros o creá tu propio VS.</p>
          <Btn onClick={() => go("create")} style={{ width: "auto", margin: "0 auto", padding: "12px 28px", fontSize: 15 }}>
            Desafiar a alguien
          </Btn>
        </div>
      ) : (
        <div>
          {filtered.map((d) => (
            <OpenVSCard key={d.id} d={d} w={w} conn={conn} go={go} showCat={cat === "all"} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ children, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px", borderRadius: 10,
        border: `1px solid ${active ? color + "40" : C.sf2}`,
        background: active ? color + "12" : "transparent",
        color: active ? color : C.t2,
        fontSize: 12, fontWeight: 600, cursor: "pointer",
        fontFamily: "'Inter'", transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   DUEL DETAIL / RESOLUTION
   ═══════════════════════════════════════════════════ */

function Detail({ w, conn, ds, sDs, id, go, fl, sConf }) {
  const d = ds.find((x) => x.id === id);
  const [al, sAl] = useState(null);
  const [cpd, sCpd] = useState(false);
  const [rp, sRp] = useState(-1);
  const cd = useCD(d?.dl || 0);

  if (!d) return <div className="fu" style={{ textAlign: "center", padding: "80px 0" }}><p>VS no encontrado</p><Btn onClick={() => go("home")} style={{ width: "auto", margin: "20px auto" }}>Volver</Btn></div>;

  const isCr = w?.toLowerCase() === d.cr.toLowerCase();
  const isOp = w?.toLowerCase() === d.op.toLowerCase();
  const canAcc = d.st === "open" && w && !isCr;
  const canRes = d.st === "accepted" && cd.exp;
  const canCan = d.st === "open" && isCr;
  const hw = d.win !== Z;
  const iW = hw && w?.toLowerCase() === d.win.toLowerCase();
  const uSt = d.st === "resolved" ? (iW ? "won" : hw ? "lost" : "draw") : d.st;

  const doAcc = () => { sAl("acc"); setTimeout(() => { sDs((p) => p.map((x) => x.id === id ? { ...x, op: w, st: "accepted" } : x)); sAl(null); fl(`Aceptaste — hay $${d.stake * 2} en juego`); }, 2200); };

  const doRes = () => {
    sAl("res"); sRp(0);
    setTimeout(() => sRp(1), 1500);
    setTimeout(() => sRp(2), 3200);
    setTimeout(() => sRp(3), 4800);
    setTimeout(() => {
      const wn = Math.random() > 0.35 ? d.cr : d.op;
      sDs((p) => p.map((x) => x.id === id ? { ...x, st: "resolved", win: wn, sum: "Argentina le ganó 2–1 a Brasil.", src: ["ESPN", "TyC", "Olé"] } : x));
      sAl(null); sRp(-1); sConf(true); fl("PROVEN.");
      setTimeout(() => sConf(false), 4000);
    }, 6200);
  };

  const doCan = () => { sAl("can"); setTimeout(() => { sDs((p) => p.map((x) => x.id === id ? { ...x, st: "cancelled" } : x)); sAl(null); fl("VS cancelado"); }, 1500); };

  return (
    <div className="fu">
      <button onClick={() => go(w ? "dashboard" : "home")} style={{ background: "none", border: "none", cursor: "pointer", color: C.t2, fontSize: 14, marginBottom: 20, fontFamily: "'Inter'" }}>← Volver</button>

      {/* ═══ THE PROVEN STAMP — Winner reveal ═══ */}
      {d.st === "resolved" && rp === -1 && (
        <GlassCard glowSide="both" style={{ marginBottom: 24, animation: "pulseEm 3s ease-in-out infinite", textAlign: "center" }}>
          {/* The stamp */}
          <div style={{ position: "relative" }}>
            <div style={{
              display: "inline-block", padding: "12px 32px", borderRadius: 8,
              border: `3px solid ${C.em}`, color: C.em,
              fontFamily: "'Space Grotesk'", fontSize: 32, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              transform: "rotate(-12deg)", animation: "stampIn 0.6s ease-out both",
              boxShadow: `0 0 30px ${C.emDim}0.3)`,
              marginBottom: 24,
            }}>
              PROVEN.
            </div>

            <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 26, fontWeight: 700, marginBottom: 10, animation: "fadeUp 0.5s 0.3s ease-out both" }}>
              {hw ? `Ganó @${dn(d.win)}` : "Empate"}
            </h2>

            {hw && (
              <div style={{ fontFamily: "'Space Mono'", fontSize: 28, color: C.gold, fontWeight: 700, marginBottom: 20, animation: "countRoll 0.4s 0.5s ease-out both", textShadow: `0 0 20px rgba(251,191,36,0.4)` }}>
                +${d.stake * 2}
              </div>
            )}

            {d.sum && <p style={{ fontSize: 15, color: C.t2, lineHeight: 1.6, marginBottom: 20 }}>{d.sum}</p>}

            {d.src?.length > 0 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {d.src.map((s, i) => (
                  <span key={i} style={{ padding: "4px 12px", borderRadius: 10, background: C.em + "0A", border: `1px solid ${C.em}18`, color: C.em, fontSize: 12, fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* ═══ RESOLVING — Terminal style ═══ */}
      {al === "res" && (
        <GlassCard style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, margin: "0 auto 20px", border: `3px solid transparent`, borderTopColor: C.em, animation: "spin 1s linear infinite" }} />
          <div style={{ fontFamily: "'Space Mono'", fontSize: 14, color: C.em, textAlign: "left", lineHeight: 2.2 }}>
            <div style={{ opacity: rp >= 0 ? 1 : 0.2, transition: "opacity 0.5s" }}>&gt; IA buscando pruebas...</div>
            <div style={{ opacity: rp >= 1 ? 1 : 0.2, transition: "opacity 0.5s" }}>&gt; Analizando {d.url}...</div>
            <div style={{ opacity: rp >= 2 ? 1 : 0.2, transition: "opacity 0.5s" }}>&gt; Comparando fuentes...</div>
            <div style={{ opacity: rp >= 3 ? 1 : 0.2, transition: "opacity 0.5s" }}>&gt; Emitiendo veredicto<span style={{ animation: "blink 1s step-end infinite" }}>_</span></div>
          </div>
        </GlassCard>
      )}

      {/* ═══ MAIN CARD ═══ */}
      {(d.st !== "resolved" || rp !== -1) && al !== "res" && (
        <GlassCard glowSide="both" noPad style={{ marginBottom: 20 }}>
          <div style={{ padding: "28px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              {d.st === "open" && !isCr
                ? <div style={{ fontSize: 14, fontWeight: 700, color: C.fuch }}>@{dn(d.cr)} te desafía</div>
                : <Badge st={uSt} large />
              }
              <span style={{ fontFamily: "'Space Mono'", fontSize: 11, color: C.t2 }}>#{d.id}</span>
            </div>

            {/* THE QUESTION — biggest thing */}
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: "clamp(26px, 7vw, 42px)", fontWeight: 700, lineHeight: 0.9, letterSpacing: "-0.04em", marginBottom: 28 }}>
              {d.q}
            </h1>

            {/* Split VS */}
            <div style={{ display: "flex", borderRadius: 16, overflow: "hidden", border: `2px solid ${C.sf2}`, marginBottom: 24 }}>
              <div style={{ flex: 1, background: `${C.cyanDim}0.04)`, padding: 18 }}>
                <Av side="cr" s={36} />
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>@{dn(d.cr)}{isCr && <span style={{ color: C.em, marginLeft: 6, fontSize: 10 }}>(vos)</span>}</div>
                <div style={{ fontSize: 12, color: C.cyan, marginTop: 3 }}>{d.cp}</div>
                {d.st === "resolved" && d.win.toLowerCase() === d.cr.toLowerCase() && <div style={{ fontSize: 11, fontWeight: 700, color: C.em, marginTop: 8 }}>PROVEN</div>}
              </div>
              <div style={{ width: 2, background: C.sf2 }} />
              <div style={{ flex: 1, background: `${C.fuchDim}0.04)`, padding: 18 }}>
                {d.op === Z ? (
                  <div style={{ textAlign: "center", padding: "8px 0" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 18, border: `2px dashed ${C.bd}`, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", color: C.t2, fontWeight: 700 }}>?</div>
                    <div style={{ fontSize: 12, color: C.t2, fontStyle: "italic" }}>Esperando...</div>
                  </div>
                ) : (
                  <>
                    <Av side="op" s={36} />
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>@{dn(d.op)}{isOp && <span style={{ color: C.em, marginLeft: 6, fontSize: 10 }}>(vos)</span>}</div>
                    <div style={{ fontSize: 12, color: C.fuch, marginTop: 3 }}>{d.opp}</div>
                    {d.st === "resolved" && d.win.toLowerCase() === d.op.toLowerCase() && <div style={{ fontSize: 11, fontWeight: 700, color: C.em, marginTop: 8 }}>PROVEN</div>}
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: C.sf2, borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: C.t2, marginBottom: 6 }}>Pozo</div>
                <div style={{ fontFamily: "'Space Mono'", fontSize: 24, fontWeight: 700, color: C.gold }}>${d.stake * (d.op === Z ? 1 : 2)}</div>
              </div>
              <div style={{ background: C.sf2, borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: C.t2, marginBottom: 6 }}>Deadline</div>
                {d.st !== "resolved" && d.st !== "cancelled"
                  ? <div style={{ fontFamily: "'Space Mono'", fontSize: 22, fontWeight: 700, color: cd.exp ? C.gold : C.t1 }}>{cd.txt}</div>
                  : <div style={{ fontSize: 14, color: C.t2 }}>Finalizado</div>
                }
              </div>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${C.sf2}`, padding: "12px 24px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: C.em, boxShadow: `0 0 8px ${C.em}60` }} />
            <span style={{ fontSize: 12, color: C.t2 }}>PROVEN verifica automáticamente</span>
          </div>
        </GlassCard>
      )}

      {/* ═══ ACTIONS ═══ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {canAcc && <Btn variant="fuch" onClick={w ? doAcc : conn} disabled={!!al}>
          {al === "acc" ? <><Sp c="#fff" /> Aceptando...</> : `Aceptar y Poner $${d.stake}`}
        </Btn>}

        {d.st === "open" && !w && <Btn onClick={conn}>Conectar Wallet</Btn>}

        {canRes && al !== "res" && <Btn variant="em" onClick={doRes}>Resolver VS</Btn>}

        {d.st === "accepted" && !cd.exp && al !== "res" && (
          <GlassCard style={{ textAlign: "center", padding: 20 }}><p style={{ fontSize: 14, color: C.t2 }}>Esperando deadline...</p></GlassCard>
        )}

        {d.st === "open" && isCr && (
          <GlassCard style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Mandá este link:</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input readOnly value={`proven.app/vs/${d.id}`} style={{ flex: 1, padding: "12px 16px", borderRadius: 14, background: C.sf2, border: `1px solid ${C.bd}`, color: C.t1, fontSize: 12, fontFamily: "'Space Mono'" }} />
              <button onClick={() => { sCpd(true); fl("Link copiado"); setTimeout(() => sCpd(false), 2000); }} style={{ padding: "12px 18px", borderRadius: 14, border: "none", background: C.t1, color: C.bg, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{cpd ? "Listo" : "Copiar"}</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {["WhatsApp", "Telegram"].map((s) => <button key={s} style={{ flex: 1, padding: "10px", borderRadius: 12, border: `1px solid ${C.bd}`, background: "transparent", color: C.t2, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>{s}</button>)}
            </div>
          </GlassCard>
        )}

        {canCan && <Btn variant="danger" onClick={doCan} disabled={!!al}>{al === "can" ? <><Sp c={C.red} /> Cancelando...</> : "Cancelar VS"}</Btn>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════ */

function Dash({ w, conn, ds, go }) {
  const [tab, sTab] = useState("all");

  if (!w) return (
    <div className="fu" style={{ textAlign: "center", padding: "80px 0" }}>
      <div style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 700, color: C.em, marginBottom: 12 }}>PROVEN.</div>
      <p style={{ color: C.t2, marginBottom: 20 }}>Conectá tu wallet para ver tus VS.</p>
      <Btn onClick={conn} style={{ width: "auto", margin: "0 auto", padding: "14px 32px" }}>Conectar</Btn>
    </div>
  );

  const my = ds.filter((d) => d.cr.toLowerCase() === w.toLowerCase() || d.op.toLowerCase() === w.toLowerCase());
  const flt = tab === "all" ? my : tab === "active" ? my.filter((d) => d.st === "open" || d.st === "accepted") : my.filter((d) => d.st === "resolved" || d.st === "cancelled");
  const wn = my.filter((d) => d.st === "resolved" && d.win.toLowerCase() === w.toLowerCase()).length;
  const ls = my.filter((d) => d.st === "resolved" && d.win !== Z && d.win.toLowerCase() !== w.toLowerCase()).length;

  return (
    <div className="fu">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 24, fontWeight: 700 }}>Mis VS</h1>
          <p style={{ fontSize: 13, color: C.t2, marginTop: 4, fontFamily: "'Space Mono'" }}>{my.length} total · {wn}W · {ls}L</p>
        </div>
        <Chip onClick={() => go("create")} glow="cyan">+ Nuevo</Chip>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[{ l: "Todos", v: "all" }, { l: "Activos", v: "active" }, { l: "Resueltos", v: "done" }].map(({ l, v }) => (
          <button key={v} onClick={() => sTab(v)} style={{
            padding: "8px 18px", borderRadius: 12,
            border: `1px solid ${tab === v ? C.t1 + "18" : C.sf2}`,
            background: tab === v ? C.t1 + "08" : "transparent",
            color: tab === v ? C.t1 : C.t2,
            fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter'",
          }}>{l}</button>
        ))}
      </div>

      {flt.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 20, fontWeight: 700, color: C.em, marginBottom: 8 }}>PROVEN.</div>
          <p style={{ color: C.t2, marginBottom: 16 }}>No hay VS acá</p>
          <Btn onClick={() => go("create")} style={{ width: "auto", margin: "0 auto", padding: "12px 28px" }}>Desafiar a alguien</Btn>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {flt.map((d) => {
            const iW = d.st === "resolved" && d.win.toLowerCase() === w.toLowerCase();
            const iL = d.st === "resolved" && d.win !== Z && d.win.toLowerCase() !== w.toLowerCase();
            const st2 = iW ? "won" : iL ? "lost" : d.st;
            return (
              <GlassCard key={d.id} style={{ cursor: "pointer" }}>
                <div onClick={() => go("duel", d.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <Badge st={st2} />
                    <span style={{ fontFamily: "'Space Mono'", fontSize: 13, fontWeight: 700, color: C.gold }}>${d.stake * (d.op === Z ? 1 : 2)}</span>
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 700, lineHeight: 1.15, marginBottom: 14 }}>{d.q}</div>
                  <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.sf2}` }}>
                    <div style={{ flex: 1, padding: "8px 12px", background: `${C.cyanDim}0.03)` }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.cyan + "80", marginBottom: 2 }}>Creador</div>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.cp}</div>
                    </div>
                    <div style={{ width: 1, background: C.sf2 }} />
                    <div style={{ flex: 1, padding: "8px 12px", background: `${C.fuchDim}0.03)` }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.fuch + "80", marginBottom: 2 }}>Rival</div>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.opp}</div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
