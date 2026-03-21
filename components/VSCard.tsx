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
}

export default function VSCard({
  vs,
  showCategory = false,
  showAcceptCTA = false,
}: VSCardProps) {
  const catInfo = getCategoryInfo(vs.category);
  const isOpen = vs.opponent === ZERO_ADDRESS;
  const pool = vs.stake_amount * (isOpen ? 1 : 2);
  const t = useTranslations("vsDetail");
  const tCat = useTranslations("categories");

  return (
    <Link href={`/vs/${vs.id}`} className="block group">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="card card-hover p-5 relative"
      >
        <div className="absolute top-0 left-0 w-2/5 h-full bg-[radial-gradient(ellipse_at_0%_50%,rgba(34,211,238,0.04),transparent_65%)] pointer-events-none" />

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
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border"
                  style={{
                    backgroundColor: catInfo.color + "12",
                    borderColor: catInfo.color + "20",
                    color: catInfo.color,
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

          <div className="font-display text-lg font-bold leading-snug mb-3.5">
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
            <div className="w-full py-3 mt-3.5 rounded-xl bg-pv-fuch/10 border border-pv-fuch/20 text-center font-display text-sm font-bold text-pv-fuch group-hover:bg-pv-fuch/15 transition-colors">
              {t("acceptAndStake", { amount: vs.stake_amount })}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
