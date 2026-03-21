"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { VSData } from "@/lib/contract";
import { shortenAddress, getCategoryInfo, ZERO_ADDRESS } from "@/lib/constants";
import VSStrip from "./ui/VSStrip";

interface VSCardProps {
  vs: VSData;
  showCategory?: boolean;
  showAcceptCTA?: boolean;
  /** VS de demostración (ids negativos): estilo distinto + badge opcional */
  isSample?: boolean;
  sampleBadgeLabel?: string;
  /**
   * Si se define, la píldora de categoría enlaza a Explore con `?cat=` (misma categoría que `vs.category`).
   * Usa overlay + `pointer-events` para evitar `<a>` anidados.
   */
  categoryFilterHref?: string;
}

const categoryPillClass =
  "rounded border border-pv-emerald/28 bg-pv-emerald/[0.08] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-pv-emerald";

export default function VSCard({
  vs,
  showCategory = false,
  showAcceptCTA = false,
  isSample = false,
  sampleBadgeLabel,
  categoryFilterHref,
}: VSCardProps) {
  const catInfo = getCategoryInfo(vs.category);
  const isOpen = vs.opponent === ZERO_ADDRESS;
  const pool = vs.stake_amount * (isOpen ? 1 : 2);
  const t = useTranslations("vsDetail");
  const tCat = useTranslations("categories");

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`group card card-hover relative p-5 ${
        isSample
          ? "border border-dashed border-pv-emerald/35 bg-pv-surface/80 ring-1 ring-pv-emerald/[0.12]"
          : ""
      }`}
    >
      <Link
        href={`/vs/${vs.id}`}
        className="absolute inset-0 z-0 rounded"
        aria-label={vs.question}
      />

      <div className="pointer-events-none absolute left-0 top-0 h-full w-2/5 bg-[radial-gradient(ellipse_at_0%_50%,rgba(78,222,163,0.06),transparent_65%)]" />

      <div className="relative z-10 pointer-events-none">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {isSample && sampleBadgeLabel ? (
              <span className="shrink-0 rounded border border-pv-emerald/40 bg-pv-emerald/[0.1] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-pv-emerald">
                {sampleBadgeLabel}
              </span>
            ) : null}
            <span className="text-[13px] font-semibold">
              {shortenAddress(vs.creator)}
            </span>
            <span className="text-xs text-pv-muted">{t("challenges")}</span>
          </div>
          <div className="flex items-center gap-2">
            {showCategory &&
              (categoryFilterHref ? (
                <Link
                  href={categoryFilterHref}
                  className={`pointer-events-auto inline-block ${categoryPillClass} transition-colors hover:border-pv-emerald/45 hover:bg-pv-emerald/[0.12]`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {tCat(catInfo.id)}
                </Link>
              ) : (
                <span className={categoryPillClass}>{tCat(catInfo.id)}</span>
              ))}
            <span className="font-mono text-[13px] font-bold text-pv-emerald/90">
              ${pool}
            </span>
          </div>
        </div>

        <div className="font-display text-lg font-bold leading-snug mb-3.5 tracking-tight">
          {vs.question}
        </div>

        <VSStrip
          creator={vs.creator}
          creatorPosition={vs.creator_position}
          opponent={vs.opponent}
          opponentPosition={vs.opponent_position}
          isOpen={isOpen}
          compact
        />

        {showAcceptCTA && isOpen && (
          <div className="mt-3.5 w-full rounded border border-pv-emerald/25 bg-pv-emerald/[0.08] py-3 text-center font-display text-sm font-bold text-pv-emerald transition-colors group-hover:bg-pv-emerald/[0.12]">
            {t("acceptAndStake", { amount: vs.stake_amount })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
