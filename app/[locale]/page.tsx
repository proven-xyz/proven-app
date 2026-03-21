"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import { getVS, getVSCount } from "@/lib/contract";
import type { VSData } from "@/lib/contract";
import { ZERO_ADDRESS, shortenAddress } from "@/lib/constants";
import PageTransition, { AnimatedItem } from "@/components/PageTransition";
import { GlassCard, PoolBadge, Button, VSCardSkeleton } from "@/components/ui";
import VSCard from "@/components/VSCard";
import ArenaCard from "@/components/ArenaCard";
import { Zap, Send, UserRoundPlus, Shield } from "lucide-react";

export default function HomePage() {
  const { isConnected, connect } = useWallet();
  const [allVS, setAllVS]     = useState<VSData[]>([]);
  const [loading, setLoading] = useState(true);
  const t  = useTranslations("home");
  const tc = useTranslations("common");

  useEffect(() => {
    async function load() {
      try {
        const count    = await getVSCount();
        const promises = Array.from({ length: count }, (_, i) => getVS(i + 1));
        const results  = await Promise.all(promises);
        setAllVS(results.filter((v): v is VSData => v !== null));
      } catch (e) {
        console.error("Failed to load VS:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const openVS     = allVS.filter((v) => v.state === "open");
  const resolvedVS = allVS.filter((v) => v.state === "resolved");
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
  ];

  const arenaFromData = [...openVS, ...allVS.filter((v) => v.state !== "open")]
    .slice(0, 3)
    .map((vs) => ({ vs, challengersCount: undefined as number | undefined }));
  const arenaCards = [...arenaFromData, ...fallbackArenaCards].slice(0, 3);
  const isArenaFallback = openVS.length === 0;

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
      iconSrc: "/icons/message-chat-circle.svg",
      title: "2. INVITE",
      description:
        "Broadcast your link. Challenge a specific rival or open it to the public square.",
    },
    {
      icon: UserRoundPlus,
      title: "3. ACCEPT",
      description:
        "Rival stakes their matching amount. Smart contract activates and locks the pool.",
    },
    {
      icon: Shield,
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
            className="px-5 py-14 sm:px-8 sm:py-20 text-center"
            animate={{ opacity: featuredVS ? 0 : 1, pointerEvents: featuredVS ? "none" : "auto" }}
            transition={{ duration: 0.3 }}
            style={{ position: featuredVS ? "absolute" : "relative", inset: 0 }}
          >
            <h1 className="font-display text-[clamp(3rem,11vw,5.5rem)] font-bold leading-[0.92] tracking-tight text-pv-text mb-6">
              {t("emptyHeroTitlePrefix")}{" "}
              <span className="italic text-pv-emerald drop-shadow-[0_0_22px_rgba(78,222,163,0.6)]">
                PROVEN.
              </span>
            </h1>
            <p className="text-pv-muted text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-8">
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
                    amount={
                      featuredVS.stake_amount *
                      (featuredVS.opponent === ZERO_ADDRESS ? 1 : 2)
                    }
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
                    className="font-display text-[32px] sm:text-[32px] font-bold tracking-tight text-pv-emerald"
                    initial={{ y: 26, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 0.45,
                      ease: "easeOut",
                      delay: 0.08 * index,
                    }}
                  >
                    {item.value}
                  </motion.div>
                </div>
                <p className="mt-1 text-[12px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-pv-muted">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedItem>

      {/* How it works — 2 cols en mobile, 4 en tablet+ */}
      <AnimatedItem>
        <div className="mb-12">
          <div className="mb-5 text-left">
            <h2 className="font-display text-[clamp(1.5rem,5vw,2.25rem)] font-bold tracking-tight text-pv-text leading-none">
              THE PROTOCOL
            </h2>
            <p className="text-pv-muted text-sm mt-5 sm:mt-6 font-mono tracking-wide">
              Zero trust. Pure code. Total proof.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {steps.map(({ icon: Icon, iconSrc, title, description }) => (
              <div
                key={title}
                className="card p-4 text-left border-white/[0.12] transition-all duration-200 hover:border-pv-emerald/[0.5] hover:shadow-glow-emerald group"
              >
                <div className="w-12 h-12 bg-pv-surface2/70 border border-white/[0.14] text-pv-emerald flex items-center justify-center mb-2.5 rounded-md transition-all duration-200 group-hover:border-pv-emerald/[0.5] group-hover:bg-pv-emerald/[0.14] group-hover:shadow-glow-emerald">
                  {iconSrc ? (
                    <span
                      className="w-6 h-6 bg-pv-emerald"
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
                      aria-label={title}
                    />
                  ) : (
                    Icon && <Icon size={20} />
                  )}
                </div>
                <div className="font-display text-[15px] sm:text-[17px] font-bold text-pv-emerald tracking-tight mb-1.5">
                  {title}
                </div>
                <div className="text-[13px] text-pv-muted leading-relaxed">{description}</div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedItem>

      {/* LIVE ARENA */}
      {arenaCards.length > 0 && (
        <AnimatedItem>
          <div className="mb-12">
            <div className="mb-5 text-left">
              <h2 className="font-display text-[clamp(1.5rem,5vw,2.25rem)] font-bold tracking-tight text-pv-text leading-none">
                LIVE ARENA
              </h2>
            <p className="text-pv-muted text-sm mt-5 sm:mt-6 font-mono tracking-wide">
                {isArenaFallback ? t("arenaSubtitleFallback") : t("arenaSubtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {arenaCards.map(({ vs, challengersCount }) => (
                <ArenaCard key={vs.id} vs={vs} challengersCount={challengersCount} />
              ))}
            </div>
          </div>
        </AnimatedItem>
      )}

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
                    sum +
                    v.stake_amount * (v.opponent === ZERO_ADDRESS ? 1 : 2),
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
      {resolvedVS.length > 0 && (
        <AnimatedItem>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-pv-emerald shadow-[0_0_8px_rgba(78,222,163,0.6)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald">
                {t("recentlyProven")}
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {resolvedVS.slice(0, 4).map((vs) => (
                <Link key={vs.id} href={`/vs/${vs.id}`} className="block group">
                  <motion.div
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-3 bg-pv-surface border border-white/[0.1] group-hover:border-pv-emerald/[0.25] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-pv-emerald/[0.1] border border-pv-emerald/[0.25] flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-pv-emerald" />
                      </div>
                      <span className="text-[13px] truncate">
                        <span className="font-semibold">
                          {shortenAddress(vs.winner)}
                        </span>
                        <span className="text-pv-muted"> {t("won")}</span>
                      </span>
                    </div>
                    <span className="font-mono text-[13px] font-bold text-pv-gold flex-shrink-0 ml-2">
                      +${vs.stake_amount * 2}
                    </span>
                  </motion.div>
                </Link>
              ))}
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
