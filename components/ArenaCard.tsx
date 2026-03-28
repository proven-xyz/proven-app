"use client";

import { Link } from "@/i18n/navigation";
import { getVSChallengerCount, getVSTotalPot, type VSData } from "@/lib/contract";
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
  /** Pill label “ARCHIVE” (shorter) instead of “ARCHIVED” for curated / demo cards. */
  archiveLabelShort?: boolean;
}

function formatArenaIdCode(id: number): string {
  const n = Math.abs(id) % 100000;
  const padded = String(n).padStart(4, "0");
  const letter = String.fromCharCode(65 + (Math.abs(id) % 26));
  return `#${padded}-${letter}`;
}

type ArenaStatusKey = "arenaStatusLive" | "arenaStatusPending" | "arenaStatusArchived";

function getArenaPresentation(vs: ArenaVS): {
  statusKey: ArenaStatusKey;
  statusVariant: "live" | "muted" | "archived";
} {
  if (vs.state === "resolved" || vs.state === "cancelled") {
    return { statusKey: "arenaStatusArchived", statusVariant: "archived" };
  }
  if (vs.state === "accepted") {
    return { statusKey: "arenaStatusLive", statusVariant: "live" };
  }
  return { statusKey: "arenaStatusPending", statusVariant: "muted" };
}

export default function ArenaCard({
  vs,
  challengersCount,
  archiveLabelShort = false,
}: ArenaCardProps) {
  const t = useTranslations("home");
  const tCat = useTranslations("categories");
  const tDetail = useTranslations("vsDetail");

  const pool = getVSTotalPot(vs as VSData);
  const activeChallengers = challengersCount ?? getVSChallengerCount(vs as VSData);
  const marketType = vs.market_type ?? "binary";
  const { statusKey, statusVariant } = getArenaPresentation(vs);
  const isArchived = vs.state === "resolved" || vs.state === "cancelled";
  const statusPillMessageKey =
    isArchived && archiveLabelShort ? "arenaStatusArchive" : statusKey;

  const statusPillClass =
    statusVariant === "live"
      ? "font-display text-xs font-semibold uppercase tracking-wide text-pv-emerald bg-pv-emerald/10 px-2 py-1"
      : statusVariant === "archived"
        ? "font-display text-xs font-semibold uppercase tracking-wide text-pv-muted bg-white/[0.06] px-2 py-1 ring-1 ring-white/[0.08]"
        : "font-display text-xs font-semibold uppercase tracking-wide text-pv-muted bg-white/[0.06] px-2 py-1 ring-1 ring-white/[0.08]";

  return (
    <Link href={`/vs/${vs.id}`} className="group block h-full">
      <article
        className="card relative flex h-full flex-col gap-6 overflow-hidden border-white/[0.12] bg-pv-surface p-6 transition-all duration-300 hover:border-pv-emerald/35 hover:bg-[#131313] sm:gap-8 sm:p-8"
      >
        <div
          className="pointer-events-none absolute left-0 top-0 h-0 w-1 bg-pv-emerald transition-[height] duration-500 ease-out group-hover:h-full"
          aria-hidden
        />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <span className={statusPillClass}>{t(statusPillMessageKey)}</span>
          <span className="rounded px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-pv-muted ring-1 ring-white/[0.1] bg-white/[0.03] backdrop-blur-sm">
            {t("arenaIdBadge", { code: formatArenaIdCode(vs.id) })}
          </span>
        </div>

        <div className="relative z-10 min-w-0 flex-1">
          <h3 className="line-clamp-3 font-display text-xl font-bold uppercase leading-tight tracking-tight text-pv-text sm:text-2xl">
            {vs.question}
          </h3>
          <p className="mt-2 text-left text-xs leading-relaxed text-pv-muted sm:text-[13px]">
            {t("arenaCardSubtitle", {
              category: tCat(vs.category),
              market: tDetail(`marketTypes.${marketType}`),
              pool,
            })}
          </p>
        </div>

        <div className="relative z-10 mt-auto border-t border-white/[0.1] pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <span className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pv-muted">
                {t("arenaParticipantsLabel")}
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center pl-0.5">
                  {["bg-pv-surface2", "bg-pv-surface", "bg-pv-emerald/30"].map((color, i) => (
                    <span
                      key={`${vs.id}-avatar-${i}`}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.15] ${color} ${i > 0 ? "-ml-2.5" : ""}`}
                      style={{ zIndex: 10 - i }}
                    >
                      <UserRound size={14} className="text-pv-text/90" aria-hidden />
                    </span>
                  ))}
                </div>
                <span className="font-display text-2xl font-bold tabular-nums tracking-tight text-pv-text sm:text-3xl">
                  {activeChallengers}
                </span>
              </div>
            </div>

            <span
              className={`inline-flex shrink-0 items-center justify-center px-5 py-2 font-display text-[10px] font-bold uppercase tracking-[0.18em] transition-colors duration-200 ${
                isArchived
                  ? "rounded-md border border-white/[0.28] bg-pv-bg text-pv-muted group-hover:border-white/[0.34] group-hover:text-pv-muted"
                  : "rounded-md bg-pv-text text-pv-bg group-hover:bg-pv-emerald group-hover:text-pv-bg"
              }`}
            >
              {isArchived ? t("arenaViewDetails") : t("arenaJoin")}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
