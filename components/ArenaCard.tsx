"use client";

import { Link } from "@/i18n/navigation";
import type { VSData } from "@/lib/contract";
import { ZERO_ADDRESS } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { UserRound } from "lucide-react";

type ArenaVS = Pick<
  VSData,
  "id" | "question" | "stake_amount" | "opponent" | "category" | "state"
>;

interface ArenaCardProps {
  vs: ArenaVS;
  challengersCount?: number;
}

export default function ArenaCard({ vs, challengersCount }: ArenaCardProps) {
  const t = useTranslations("home");
  const tCat = useTranslations("categories");

  const isOpen = vs.opponent === ZERO_ADDRESS;
  const pool = vs.stake_amount * (isOpen ? 1 : 2);
  const activeChallengers = challengersCount ?? (isOpen ? 1 : 2);
  
  return (
    <Link href={`/vs/${vs.id}`} className="block h-full group">
      <article className="card h-full p-4 text-left border-white/[0.12] transition-all duration-200 hover:border-pv-emerald/[0.35] hover:shadow-glow-emerald flex flex-col">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="rounded border border-pv-emerald/28 bg-pv-emerald/[0.08] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-pv-emerald">
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
                className={`w-7 h-7 rounded-full border border-white/[0.22] ${color} ${i > 0 ? "-ml-3" : ""} flex items-center justify-center`}
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

        <div className="w-full mt-auto py-2.5 rounded border border-pv-emerald/[0.28] bg-pv-emerald/[0.08] text-center font-display text-sm font-bold text-pv-emerald transition-colors group-hover:bg-pv-emerald/[0.13]">
          {t("arenaJoin")}
        </div>
      </article>
    </Link>
  );
}

