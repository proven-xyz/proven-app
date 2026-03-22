"use client";

import { Link } from "@/i18n/navigation";
import { getVSChallengerCount, getVSTotalPot, type VSData } from "@/lib/contract";
import { ZERO_ADDRESS } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { UserRound } from "lucide-react";

type ArenaVS = Pick<
  VSData,
  | "id"
  | "question"
  | "stake_amount"
  | "opponent"
  | "category"
  | "state"
  | "challenger_count"
  | "market_type"
  | "total_pot"
  | "max_challengers"
>;

interface ArenaCardProps {
  vs: ArenaVS;
  challengersCount?: number;
}

export default function ArenaCard({ vs, challengersCount }: ArenaCardProps) {
  const t = useTranslations("home");
  const tCat = useTranslations("categories");
  const tDetail = useTranslations("vsDetail");

  const isOpen = vs.opponent === ZERO_ADDRESS;
  const pool = getVSTotalPot(vs as VSData);
  const activeChallengers = challengersCount ?? getVSChallengerCount(vs as VSData);
  const maxChallengers =
    typeof vs.max_challengers === "number" && vs.max_challengers > 0
      ? vs.max_challengers
      : 1;
  const marketType = vs.market_type ?? "binary";
  
  return (
    <Link href={`/vs/${vs.id}`} className="block h-full group">
      <article className="card h-full !border-pv-emerald/[0.14] p-4 text-left transition-all duration-200 hover:!border-pv-emerald/[0.35] hover:shadow-glow-emerald flex flex-col">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="rounded border border-pv-emerald/25 bg-pv-emerald/[0.06] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-pv-emerald/90">
            {tCat(vs.category)}
          </span>
          <span className="rounded border border-pv-emerald/25 bg-pv-emerald/[0.06] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-pv-emerald/90">
            POOL: ${pool}
          </span>
        </div>

        <h3 className="font-display text-[18px] sm:text-[19px] font-bold leading-snug tracking-tight text-pv-text mb-3.5 min-h-[3.5rem]">
          {vs.question}
        </h3>

        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="flex items-center">
            {["bg-pv-surface2", "bg-pv-surface", "bg-pv-emerald"].map((color, i) => (
              <span
                key={`${vs.id}-avatar-${i}`}
                className={`w-7 h-7 rounded-full border border-pv-emerald/25 ${color} ${i > 0 ? "-ml-3" : ""} flex items-center justify-center`}
                style={{ zIndex: 10 - i }}
              >
                <UserRound size={13} className="text-pv-text/85" />
              </span>
            ))}
          </div>
          <p className="text-xs text-pv-text/70 font-medium">
            {t("arenaChallengers", { count: activeChallengers })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-3.5">
          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-[0.12em] border border-pv-emerald/[0.25] bg-pv-emerald/[0.08] text-pv-emerald">
            {tDetail(`marketTypes.${marketType}`)}
          </span>
          <span className="px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-[0.12em] border border-white/[0.12] text-pv-muted">
            {activeChallengers}/{maxChallengers}
          </span>
        </div>
        <div className="w-full mt-auto py-2.5 rounded border border-pv-emerald/[0.28] bg-pv-emerald/[0.08] text-center font-display text-sm font-bold text-pv-emerald transition-colors group-hover:bg-pv-emerald/[0.13]">
          {t("arenaJoin")}
        </div>
      </article>
    </Link>
  );
}

