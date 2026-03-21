"use client";

import { Link } from "@/i18n/navigation";
import type { VSData } from "@/lib/contract";
import { ZERO_ADDRESS, getCategoryInfo } from "@/lib/constants";
import { useTranslations } from "next-intl";

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

  const catInfo = getCategoryInfo(vs.category);
  const isOpen = vs.opponent === ZERO_ADDRESS;
  const pool = vs.stake_amount * (isOpen ? 1 : 2);
  const activeChallengers = challengersCount ?? (isOpen ? 1 : 2);
  
  return (
    <Link href={`/vs/${vs.id}`} className="block h-full group">
      <article className="card h-full p-4 text-left border-white/[0.12] transition-all duration-200 hover:border-pv-cyan/[0.35] hover:shadow-glow flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span
            className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-[0.12em] border"
            style={{
              backgroundColor: `${catInfo.color}14`,
              borderColor: `${catInfo.color}4A`,
              color: catInfo.color,
            }}
          >
            {tCat(catInfo.id)}
          </span>
          <span className="px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-[0.12em] border border-pv-gold/[0.25] bg-pv-gold/[0.08] text-pv-gold">
            POOL: ${pool}
          </span>
        </div>

        <h3 className="font-display text-[18px] sm:text-[19px] font-bold leading-snug tracking-tight text-pv-text mb-3.5 min-h-[3.5rem]">
          {vs.question}
        </h3>

        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="flex items-center">
            {["bg-pv-cyan", "bg-pv-fuch", "bg-pv-emerald"].map((color, i) => (
              <span
                key={`${vs.id}-avatar-${i}`}
                className={`w-7 h-7 rounded-full border border-pv-surface2 ${color} ${i > 0 ? "-ml-3" : ""}`}
                style={{ zIndex: 10 - i }}
              />
            ))}
          </div>
          <p className="text-xs text-pv-muted font-medium">
            {t("arenaChallengers", { count: activeChallengers })}
          </p>
        </div>

        <div className="w-full mt-auto py-2.5 rounded border border-pv-cyan/[0.25] bg-pv-cyan/[0.07] text-center font-display text-sm font-bold text-pv-cyan transition-colors group-hover:bg-pv-cyan/[0.12]">
          {t("arenaJoin")}
        </div>
      </article>
    </Link>
  );
}

