"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getVSChallengerCount,
  getVSTotalPot,
  isVSJoinable,
  type VSData,
} from "@/lib/contract";
import { shortenAddress, getCategoryInfo, ZERO_ADDRESS } from "@/lib/constants";
import VSStrip from "./ui/VSStrip";

interface VSCardProps {
  vs: VSData;
  showCategory?: boolean;
  showAcceptCTA?: boolean;
}

export default function VSCard({
  vs,
  showCategory = false,
  showAcceptCTA = false,
}: VSCardProps) {
  const catInfo = getCategoryInfo(vs.category);
  const isOpen  = vs.opponent === ZERO_ADDRESS;
  const pool    = getVSTotalPot(vs);
  const isJoinable = isVSJoinable(vs);
  const challengerCount = getVSChallengerCount(vs);
  const maxChallengers =
    typeof vs.max_challengers === "number" && vs.max_challengers > 0
      ? vs.max_challengers
      : 1;
  const marketType = vs.market_type ?? "binary";
  const oddsMode = vs.odds_mode ?? "pool";
  const t       = useTranslations("vsDetail");
  const tCat    = useTranslations("categories");

  return (
    <Link href={`/vs/${vs.id}`} className="block group">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="card card-hover p-5 relative"
      >
        <div className="absolute top-0 left-0 w-2/5 h-full bg-[radial-gradient(ellipse_at_0%_50%,rgba(93,230,255,0.05),transparent_65%)] pointer-events-none" />

        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold">
                {shortenAddress(vs.creator)}
              </span>
              <span className="text-xs text-pv-muted">{t("challenges")}</span>
            </div>
            <div className="flex items-center gap-2">
              {showCategory && (
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border"
                  style={{
                    backgroundColor: catInfo.color + "12",
                    borderColor:     catInfo.color + "25",
                    color:           catInfo.color,
                  }}
                >
                  {tCat(catInfo.id)}
                </span>
              )}
              <span className="font-mono text-[13px] font-bold text-pv-gold">
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

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-[0.12em] border border-pv-cyan/[0.25] bg-pv-cyan/[0.08] text-pv-cyan">
              {t(`marketTypes.${marketType}`)}
            </span>
            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-[0.12em] border border-pv-fuch/[0.25] bg-pv-fuch/[0.08] text-pv-fuch">
              {oddsMode === "fixed" ? t("oddsModes.fixed") : t("oddsModes.pool")}
            </span>
            <span className="px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-[0.12em] border border-white/[0.12] text-pv-muted">
              {t("slotsFilled", { count: challengerCount, total: maxChallengers })}
            </span>
          </div>

          {showAcceptCTA && isJoinable && (
            <div className="w-full py-3 mt-3.5 rounded bg-pv-fuch/[0.08] border border-pv-fuch/[0.2] text-center font-display text-sm font-bold text-pv-fuch group-hover:bg-pv-fuch/[0.13] transition-colors">
              {t("acceptAndStake", { amount: vs.stake_amount })}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
