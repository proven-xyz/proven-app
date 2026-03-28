"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import {
  getAllVSFast,
  getVSChallengerCount,
  getVSSingleWinnerPayout,
  getVSTotalPot,
  hasVSWinner,
  isVSJoinable,
  type VSData,
} from "@/lib/contract";
import { ZERO_ADDRESS, shortenAddress } from "@/lib/constants";
import { mergePendingVS } from "@/lib/pending-vs";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { GlassCard, PoolBadge, Button, VSCardSkeleton } from "@/components/ui";
import VSCard from "@/components/VSCard";
import ArenaCard from "@/components/ArenaCard";
import ArenaProposeCard from "@/components/ArenaProposeCard";
import SettlementArchiveSection from "@/components/SettlementArchiveSection";

type ParsedStat = {
  prefix: string;
  unit: string; // e.g. "M" or "B"
  suffix: string; // e.g. "+" or "%"
  target: number;
  decimals: number;
};

function parseStat(raw: string): ParsedStat | null {
  const trimmed = raw.trim();

  let prefix = "";
  let suffix = "";
  let unit = "";
  let working = trimmed;

  if (working.startsWith("$")) {
    prefix = "$";
    working = working.slice(1);
  }

  if (working.endsWith("%")) {
    suffix = "%";
    working = working.slice(0, -1);
  }

  const m = working.match(/^([0-9]+(?:\.[0-9]+)?)([MB])?(\+)?$/);
  if (!m) return null;

  const numStr = m[1];
  unit = m[2] ?? "";
  const matchSuffix = m[3] ?? "";
  suffix = suffix || matchSuffix;
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;

  return {
    prefix,
    unit,
    suffix,
    target: Number.parseFloat(numStr),
    decimals,
  };
}

function formatStat(current: number, parsed: ParsedStat): string {
  const formattedNumber =
    parsed.decimals > 0 ? current.toFixed(parsed.decimals) : current.toFixed(0);

  return `${parsed.prefix}${formattedNumber}${parsed.unit}${parsed.suffix}`;
}

function AnimatedStatNumber({
  raw,
  delayMs,
}: {
  raw: string;
  delayMs: number;
}) {
  const parsed = useMemo(() => parseStat(raw), [raw]);
  const reducedMotion = useReducedMotion();

  const targetText = useMemo(
    () => (parsed ? formatStat(parsed.target, parsed) : raw),
    [parsed, raw]
  );
  const initialText = useMemo(
    () => (parsed ? formatStat(0, parsed) : raw),
    [parsed, raw]
  );

  const [display, setDisplay] = useState(initialText);
  const ref = useRef<HTMLSpanElement | null>(null);
  const startedRef = useRef(false);
  const isInView = useInView(ref, { once: true, amount: 0.05 });

  useEffect(() => {
    if (startedRef.current) return;

    if (!parsed) {
      startedRef.current = true;
      setDisplay(raw);
      return;
    }

    if (reducedMotion) {
      startedRef.current = true;
      setDisplay(targetText);
      return;
    }

    let rafId: number | null = null;
    let timeoutId: number | null = null;
    let fallbackTimeoutId: number | null = null;

    const startAnimation = () => {
      const from = 0;
      const to = parsed.target;
      const durationMs = 1700;
      const start = performance.now();

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        // Ease-out cubic for a professional, smooth feel.
        const eased = 1 - Math.pow(1 - t, 3);
        const current = from + (to - from) * eased;

        setDisplay(formatStat(current, parsed));

        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          setDisplay(targetText);
        }
      };

      rafId = requestAnimationFrame(tick);
    };

    const trigger = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      timeoutId = window.setTimeout(startAnimation, delayMs);
    };

    // Ideal: iniciar en el momento exacto en que entra al viewport.
    if (isInView) {
      trigger();
      return () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (rafId) window.cancelAnimationFrame(rafId);
      };
    }

    // Fallback mobile: en algunos casos con targets inline y header fijo,
    // IntersectionObserver puede tardar o no disparar con el umbral.
    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    if (!isMobile) return;

    fallbackTimeoutId = window.setTimeout(() => {
      if (startedRef.current) return;
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const within = rect.top < window.innerHeight * 1.05 && rect.bottom > 0;
      if (!within) return;

      trigger();
    }, delayMs + 250);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (rafId) window.cancelAnimationFrame(rafId);
      if (fallbackTimeoutId) window.clearTimeout(fallbackTimeoutId);
    };
  }, [delayMs, isInView, parsed, raw, reducedMotion, targetText]);

  useEffect(() => {
    // If the stat text changes (new locale/data), reset and allow replay once.
    startedRef.current = false;
    setDisplay(initialText);
  }, [initialText, raw]);

  return (
    <span ref={ref} aria-label={raw} className="inline-block">
      {display}
    </span>
  );
}

export default function HomePage() {
  const { isConnected, connect } = useWallet();
  const [allVS, setAllVS]     = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);
  const t  = useTranslations("home");
  const tStamp = useTranslations("stamp");

  useEffect(() => {
    async function load() {
      try {
        const results = await getAllVSFast();
        setAllVS(mergePendingVS(results));
      } catch (e) {
        console.error("Failed to load VS:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const openVS     = allVS.filter((v) => isVSJoinable(v));
  const resolvedVS = allVS.filter((v) => v.state === "resolved");
  const decidedResolvedVS = resolvedVS.filter((v) => hasVSWinner(v));
  const featuredVS = allVS[0];
  const fallbackArenaCards = [
    {
      vs: {
        id: -1,
        question: "BTC Price will break $100k before March 31",
        stake_amount: 12,
        opponent: ZERO_ADDRESS,
        category: "crypto",
        state: "open" as const,
      },
      challengersCount: 7,
    },
    {
      vs: {
        id: -2,
        question: "GPT-5 Announced by OpenAI before June",
        stake_amount: 4,
        opponent: ZERO_ADDRESS,
        category: "tech",
        state: "open" as const,
      },
      challengersCount: 13,
    },
    {
      vs: {
        id: -3,
        question: "Lakers win the western conference",
        stake_amount: 8,
        opponent: ZERO_ADDRESS,
        category: "deportes",
        state: "open" as const,
      },
      challengersCount: 4,
    },
    {
      vs: {
        id: -4,
        question: "Fed cuts rates before Q3 2026",
        stake_amount: 15,
        opponent: ZERO_ADDRESS,
        category: "custom",
        state: "accepted" as const,
      },
      challengersCount: 3,
    },
    {
      vs: {
        id: -5,
        question: "Ethereum ETF daily inflows exceed $50M",
        stake_amount: 6,
        opponent: ZERO_ADDRESS,
        category: "crypto",
        state: "resolved" as const,
      },
      challengersCount: 11,
    },
  ];

  const arenaFromData = [...openVS, ...allVS.filter((v) => v.state !== "open")]
    .slice(0, 6)
    .map((vs) => ({ vs, challengersCount: undefined as number | undefined }));
  const arenaMerged = [...arenaFromData, ...fallbackArenaCards];
  const arenaCardsRow1 = arenaMerged.slice(0, 3);
  const arenaCardsRow2 = arenaMerged.slice(3, 5);

  const steps = [
    {
      icon: null,
      iconSrc: "/icons/handshake-logo.svg",
      title: "1. CHALLENGE",
      description:
        "Define your terms and lock your stake in the vault. The AI starts watching.",
    },
    {
      icon: null,
      iconSrc: "/icons/letter.svg",
      title: "2. INVITE",
      description:
        "Broadcast your link. Challenge a specific rival or open it to the public square.",
    },
    {
      icon: null,
      iconSrc: "/icons/check-circle-logo.svg",
      title: "3. ACCEPT",
      description:
        "Rival stakes their matching amount. Smart contract activates and locks the pool.",
    },
    {
      icon: null,
      iconSrc: "/icons/verified.svg",
      title: "4. PROVEN",
      description:
        "Consensus validates the proof, and the winner gets paid on-chain instantly.",
    },
  ];

  return (
    <PageTransition>
      {/* Hero — altura reservada siempre desde el primer render para evitar CLS */}
      <AnimatedItem>
        <div className="relative lg:max-w-[800px] lg:mx-auto mb-6">

          {/* Hero vacío: siempre visible, se oculta con fade cuando carga un VS destacado */}
          <motion.div
            className="px-5 py-14 sm:px-8 sm:py-20 lg:py-28 xl:py-32 text-center"
            animate={{ opacity: featuredVS ? 0 : 1, pointerEvents: featuredVS ? "none" : "auto" }}
            transition={{ duration: 0.3 }}
            style={{ position: featuredVS ? "absolute" : "relative", inset: 0 }}
          >
            <h1 className="font-display text-[clamp(3rem,11vw,5.5rem)] lg:text-[clamp(3.7rem,9vw,8rem)] font-bold leading-[0.92] tracking-tight text-pv-text mb-6">
              {t("emptyHeroTitlePrefix")}{" "}
              <span className="italic text-pv-emerald drop-shadow-[0_0_22px_rgba(78,222,163,0.6)]">
                PROVEN.
              </span>
            </h1>
            <p className="text-pv-muted text-sm sm:text-base lg:text-[19px] lg:max-w-[26rem] max-w-xl mx-auto leading-relaxed mb-8">
              {t("emptyHeroSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto">
              <Link href="/vs/create" className="block sm:flex-1 sm:min-w-0">
                <Button variant="primary">{t("heroChallengeSomeone")}</Button>
              </Link>
              <Link href="/explore" className="block sm:flex-1 sm:min-w-0">
                <Button variant="ghost">{t("heroExploreChallenges")}</Button>
              </Link>
            </div>
          </motion.div>

          {/* VS del día: aparece con fade sobre el mismo espacio cuando hay datos */}
          {featuredVS && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="lg:py-28 xl:py-32"
            >
              <GlassCard glow="both">
                <div className="p-2 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald mb-6">
                    {t("vsOfDay")}
                  </div>
                  <h1 className="font-display text-[clamp(30px,5vw,48px)] font-bold leading-[0.92] tracking-tight mb-7">
                    {featuredVS.question}
                  </h1>
              <PoolBadge
                    amount={getVSTotalPot(featuredVS)}
                    large
                  />
                </div>
              </GlassCard>
              {/* CTAs solo cuando hay VS destacado */}
              <div className="flex flex-col sm:flex-row gap-3 mt-3">
                {isConnected ? (
                  <Link href="/vs/create" className="block sm:flex-1">
                    <Button variant="primary">{t("challengeSomeone")}</Button>
                  </Link>
                ) : (
                  <Button onClick={connect} className="sm:flex-1">{t("connectWalletToStart")}</Button>
                )}
                <Link href="/explore" className="block sm:flex-1">
                  <Button variant="ghost">{t("exploreOpenVS")}</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </AnimatedItem>

      {/* Differentiator */}
      <AnimatedItem>
        <div className="mb-12">
          <div className="max-w-[900px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { value: "1.2M+", label: "TOTAL BETS SETTLED" },
              { value: "$450M+", label: "TOTAL PAID OUT" },
              { value: "99.9%", label: "AI ACCURACY" },
            ].map((item, index) => (
              <div key={item.label} className="p-5 sm:p-6 text-center bg-transparent border-0">
                <div className="overflow-hidden">
                  <motion.div
                    className="font-display text-[36px] sm:text-[40px] lg:text-[48px] font-bold tracking-tight text-pv-emerald leading-none"
                    // No usamos whileInView aquí para evitar que, en mobile,
                    // el contenido quede recortado por `overflow-hidden` si el umbral no se cumple.
                    initial={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 0.45,
                      ease: "easeOut",
                      delay: 0.08 * index,
                    }}
                  >
                    <AnimatedStatNumber raw={item.value} delayMs={80 * index} />
                  </motion.div>
                </div>
                <p className="mt-2 text-[12px] sm:text-[13px] lg:text-[14px] font-bold uppercase tracking-[0.14em] text-pv-muted">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedItem>

      {/* THE PROTOCOL — layout tipo bento (inspirado en “Market Intelligence” del prototipo) */}
      <AnimatedItem>
        <div className="mb-12">
          <div className="mb-10 flex items-center gap-4 sm:gap-6">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tighter text-pv-text sm:text-3xl md:text-4xl">
              THE PROTOCOL
            </h2>
            <div className="h-px flex-1 bg-white/[0.12]" aria-hidden />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:auto-rows-[minmax(240px,auto)]">
            {steps.map(({ iconSrc, title, description }, index) => {
              const stepLabel = `STEP ${String(index + 1).padStart(2, "0")}`;

              const renderIcon = (sizeClass: string) =>
                iconSrc ? (
                  <span
                    className={`${sizeClass} shrink-0 bg-pv-emerald`}
                    style={{
                      WebkitMaskImage: `url(${iconSrc})`,
                      maskImage: `url(${iconSrc})`,
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                    }}
                    aria-hidden
                  />
                ) : null;

              /* Fila 1: tile destacado (2 cols) + dos compactas (1+1). Fila 2: barra ancha (4 cols). */
              if (index === 0) {
                return (
                  <div
                    key={title}
                    className="card group relative col-span-1 flex flex-col justify-between overflow-hidden border-white/[0.12] p-6 transition-all duration-200 hover:border-pv-emerald/[0.45] hover:shadow-glow-emerald sm:p-8 md:col-span-2 md:min-h-[280px]"
                  >
                    <div className="pointer-events-none absolute -right-6 -top-6 opacity-[0.06] transition-opacity group-hover:opacity-[0.1] sm:-right-10 sm:-top-10">
                      {iconSrc ? (
                        <span
                          className="block h-40 w-40 bg-pv-emerald sm:h-48 sm:w-48"
                          style={{
                            WebkitMaskImage: `url(${iconSrc})`,
                            maskImage: `url(${iconSrc})`,
                            WebkitMaskRepeat: "no-repeat",
                            maskRepeat: "no-repeat",
                            WebkitMaskPosition: "center",
                            maskPosition: "center",
                            WebkitMaskSize: "contain",
                            maskSize: "contain",
                          }}
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div className="relative z-10">
                      <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pv-emerald">
                        {stepLabel}
                      </div>
                      <div className="mb-3 flex items-start gap-4">
                        {renderIcon("h-12 w-12 sm:h-14 sm:w-14")}
                        <h3 className="font-display text-xl font-bold leading-tight tracking-tight text-pv-text sm:text-2xl md:text-3xl">
                          {title.replace(/^\d+\.\s*/, "")}
                        </h3>
                      </div>
                      <p className="max-w-prose text-sm leading-relaxed text-pv-muted sm:text-[15px]">
                        {description}
                      </p>
                    </div>
                    <div className="relative z-10 mt-6 h-px bg-gradient-to-r from-pv-emerald/40 to-transparent opacity-40" />
                    <div className="relative z-10 mt-4 flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-pv-muted">
                        Protocol layer
                      </span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-pv-emerald">
                        Live
                      </span>
                    </div>
                  </div>
                );
              }

              if (index === 1 || index === 2) {
                return (
                  <div
                    key={title}
                    className="card group relative overflow-hidden flex flex-col justify-between border-white/[0.12] p-6 transition-all duration-200 hover:border-pv-emerald/[0.45] hover:shadow-glow-emerald sm:p-8 md:col-span-1 md:min-h-[280px]"
                  >
                    <div className="pointer-events-none absolute -right-9 -top-6 z-0 opacity-[0.06] transition-opacity group-hover:opacity-[0.1] sm:-right-13 sm:-top-10">
                      {iconSrc ? (
                        <span
                          className="block h-40 w-40 bg-pv-emerald sm:h-48 sm:w-48"
                          style={{
                            WebkitMaskImage: `url(${
                              index === 1
                                ? "/icons/user.svg"
                                : index === 2
                                  ? "/icons/thumb-up.svg"
                                  : iconSrc
                            })`,
                            maskImage: `url(${
                              index === 1
                                ? "/icons/user.svg"
                                : index === 2
                                  ? "/icons/thumb-up.svg"
                                  : iconSrc
                            })`,
                            WebkitMaskRepeat: "no-repeat",
                            maskRepeat: "no-repeat",
                            WebkitMaskPosition: "center",
                            maskPosition: "center",
                            WebkitMaskSize: "contain",
                            maskSize: "contain",
                          }}
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div className="relative z-10">
                      <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pv-muted">
                        {stepLabel}
                      </div>
                      <div className="mb-4">{renderIcon("h-10 w-10 sm:h-11 sm:w-11")}</div>
                      <h3 className="font-display text-lg font-bold leading-tight tracking-tight text-pv-text sm:text-xl">
                        {title}
                      </h3>
                    </div>
                    <p className="relative z-10 mt-4 text-sm leading-relaxed text-pv-muted sm:text-[15px]">
                      {description}
                    </p>
                  </div>
                );
              }

              /* index === 3 — barra ancha */
              return (
                <div
                  key={title}
                  className="card group relative col-span-1 overflow-hidden flex flex-col gap-6 border-white/[0.12] p-6 transition-all duration-200 hover:border-pv-emerald/[0.45] hover:shadow-glow-emerald sm:p-8 md:col-span-4 md:flex-row md:items-center md:justify-between md:gap-10"
                >
                  <div className="pointer-events-none absolute -right-9 -top-6 z-0 opacity-[0.06] transition-opacity group-hover:opacity-[0.1] sm:-right-13 sm:-top-10">
                    {iconSrc ? (
                      <span
                        className="block h-40 w-40 bg-pv-emerald sm:h-48 sm:w-48"
                        style={{
                          WebkitMaskImage: "url(/icons/verify.svg)",
                          maskImage: "url(/icons/verify.svg)",
                          WebkitMaskRepeat: "no-repeat",
                          maskRepeat: "no-repeat",
                          WebkitMaskPosition: "center",
                          maskPosition: "center",
                          WebkitMaskSize: "contain",
                          maskSize: "contain",
                        }}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  <div className="relative z-10 flex min-w-0 flex-1 items-start gap-4 md:items-center">
                    {renderIcon("h-11 w-11 shrink-0 sm:h-12 sm:w-12")}
                    <div className="min-w-0">
                      <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pv-muted">
                        {stepLabel}
                      </div>
                      <h3 className="font-display text-xl font-medium tracking-tighter text-pv-text sm:text-2xl md:text-3xl">
                        {title}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pv-muted sm:text-[15px]">
                        {description}
                      </p>
                    </div>
                  </div>
                  <div className="relative z-10 hidden h-12 w-px shrink-0 bg-white/[0.1] md:block" aria-hidden />
                  <div className="relative z-10 flex shrink-0 flex-col items-start gap-1 md:items-end md:text-right">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-pv-muted">
                      Settlement
                    </span>
                    <span className="font-display text-lg font-semibold text-pv-emerald sm:text-xl">
                      On-chain
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AnimatedItem>

      {/* LIVE ARENA */}
      {arenaCardsRow1.length > 0 && (
        <AnimatedItem>
          <div className="mb-12">
            <div className="mb-10 flex items-center gap-4 sm:gap-6">
              <h2 className="font-display text-2xl font-bold uppercase tracking-tighter text-pv-text sm:text-3xl md:text-4xl">
                LIVE ARENA
              </h2>
              <div className="h-px flex-1 bg-white/[0.12]" aria-hidden />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {arenaCardsRow1.map(({ vs, challengersCount }) => (
                <ArenaCard
                  key={vs.id}
                  vs={vs}
                  challengersCount={challengersCount}
                  archiveLabelShort={vs.id === -5}
                />
              ))}
              {arenaCardsRow2.map(({ vs, challengersCount }) => (
                <ArenaCard
                  key={vs.id}
                  vs={vs}
                  challengersCount={challengersCount}
                  archiveLabelShort={vs.id === -5}
                />
              ))}
              <ArenaProposeCard />
            </div>
          </div>
        </AnimatedItem>
      )}

      {/* THE ARCHIVE — settlement index + terminal (inspirado en “Archive / Odds” editorial) */}
      <AnimatedItem>
        <SettlementArchiveSection allVS={allVS} loading={loading} />
      </AnimatedItem>

      {/* READY TO WIN CTA */}
      <AnimatedItem>
        <div className="mt-16 sm:mt-20 mb-12">
          <div className="relative overflow-hidden card max-w-[900px] mx-auto p-6 sm:p-8 md:p-10 text-center border-white/[0.14]">
            <div className="pointer-events-none absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 w-36 h-36 sm:w-52 sm:h-52 rounded-full bg-pv-emerald/[0.10] blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 -translate-x-1/3 translate-y-1/3 w-40 h-40 sm:w-56 sm:h-56 rounded-full bg-pv-emerald/[0.12] blur-3xl" />
            <div className="relative z-10">
              <h2 className="font-display text-[clamp(1.8rem,7vw,3.2rem)] font-bold leading-[0.95] tracking-tight text-pv-text">
                READY TO <span className="text-pv-emerald">WIN?</span>
              </h2>
              <p className="mt-5 text-sm sm:text-base text-pv-muted max-w-[620px] mx-auto leading-relaxed">
                Don&apos;t just talk. Stake your claim and let the AI settle the score.
              </p>
              <div className="mt-6 flex justify-center">
                <Link href="/vs/create" className="block w-full sm:w-auto">
                  <Button variant="primary" className="w-full sm:w-auto px-8">
                    START CHALLENGE
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AnimatedItem>

      {/* Global stats */}
      {!loading && allVS.length > 0 && (
        <AnimatedItem>
          <div className="grid grid-cols-3 gap-2.5 lg:gap-4 mb-12">
            <div className="card p-4 text-center">
              <div className="font-mono text-xl font-bold text-pv-text">
                {allVS.length}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-pv-muted mt-1">
                {t("totalVS")}
              </div>
            </div>
            <div className="card p-4 text-center">
              <div className="font-mono text-xl font-bold text-pv-emerald">
                {resolvedVS.length}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-pv-muted mt-1">
                {t("resolved")}
              </div>
            </div>
            <div className="card p-4 text-center">
              <div className="font-mono text-xl font-bold text-pv-gold">
                $
                {allVS.reduce(
                  (sum, v) =>
                    sum + getVSTotalPot(v),
                  0
                )}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-pv-muted mt-1">
                {t("totalPool")}
              </div>
            </div>
          </div>
        </AnimatedItem>
      )}

      {/* Open VS preview — 2 cols en desktop */}
      {openVS.length > 0 && (
        <AnimatedItem>
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pv-emerald shadow-[0_0_8px_rgba(78,222,163,0.6)]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald">
                  {t("openVS")}
                </span>
              </div>
              <span className="text-[11px] text-pv-muted">
                {t("waitingRival", { count: openVS.length })}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {openVS.slice(0, 4).map((vs) => (
                <VSCard key={vs.id} vs={vs} showAcceptCTA />
              ))}
            </div>

            {openVS.length > 4 && (
              <Link
                href="/explore"
                className="block w-full py-3.5 border border-pv-emerald/[0.24] bg-pv-emerald/[0.06] text-center font-display text-sm font-bold text-pv-emerald mt-2.5 hover:bg-pv-emerald/[0.1] transition-colors"
              >
                {t("viewAllOpen", { count: openVS.length })}
              </Link>
            )}
          </div>
        </AnimatedItem>
      )}

      {/* Recently proven — 2 cols en desktop */}
      {decidedResolvedVS.length > 0 && (
        <AnimatedItem>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-pv-emerald shadow-[0_0_8px_rgba(78,222,163,0.6)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald">
                {t("recentlyProven")}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {decidedResolvedVS.slice(0, 4).map((vs) => {
                const payout = getVSSingleWinnerPayout(vs);
                const winnerLabel =
                  vs.winner_side === "challengers" &&
                  getVSChallengerCount(vs) > 1
                    ? tStamp("challengersWon")
                    : tStamp("won", { address: shortenAddress(vs.winner) });

                return (
                <Link key={vs.id} href={`/vs/${vs.id}`} className="block group">
                  <motion.div
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-3 bg-pv-surface border border-white/[0.1] group-hover:border-pv-emerald/[0.25] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-pv-emerald/[0.1] border border-pv-emerald/[0.25] flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-pv-emerald" />
                      </div>
                      <span className="text-[13px] truncate font-semibold">
                        {winnerLabel}
                      </span>
                    </div>
                    <span className="font-mono text-[13px] font-bold text-pv-gold flex-shrink-0 ml-2">
                      {payout === null ? `${getVSTotalPot(vs)} GEN` : `+${payout} GEN`}
                    </span>
                  </motion.div>
                </Link>
                );
              })}
            </div>
          </div>
        </AnimatedItem>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <VSCardSkeleton />
          <VSCardSkeleton />
        </div>
      )}
    </PageTransition>
  );
}
