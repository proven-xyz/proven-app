"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, CalendarClock, FileText, Link2 } from "lucide-react";

import type { ChallengeOpportunity } from "@/lib/claimDrafts";

const strengthBadgeClass = {
  strong: "border-pv-emerald/35 bg-pv-emerald/[0.12] text-pv-emerald",
  good: "border-pv-cyan/35 bg-pv-cyan/[0.12] text-pv-cyan",
  fair: "border-amber-400/35 bg-amber-400/[0.12] text-amber-300",
  weak: "border-white/[0.14] bg-white/[0.05] text-pv-muted",
} as const;

type ChallengeOpportunityCardProps = {
  opportunity: ChallengeOpportunity;
};

export default function ChallengeOpportunityCard({
  opportunity,
}: ChallengeOpportunityCardProps) {
  const t = useTranslations("explore");
  const tCreate = useTranslations("create");
  const tQuality = useTranslations("quality");
  const tCat = useTranslations("categories");
  const locale = useLocale();

  const deadlineLabel = useMemo(() => {
    const date = new Date(opportunity.candidate.deadlineAt);
    if (!Number.isFinite(date.getTime())) {
      return opportunity.candidate.deadlineAt;
    }

    return date.toLocaleString(locale === "en" ? "en-US" : "es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }, [locale, opportunity.candidate.deadlineAt]);

  const sourceHostname = useMemo(() => {
    try {
      return new URL(opportunity.candidate.primaryResolutionSource).hostname.replace(
        /^www\./i,
        ""
      );
    } catch {
      return opportunity.candidate.primaryResolutionSource;
    }
  }, [opportunity.candidate.primaryResolutionSource]);

  const sourceSummary = useMemo(
    () => opportunity.sourceSummary.replace(/\s+/g, " ").trim(),
    [opportunity.sourceSummary]
  );

  const settlementPreview = useMemo(
    () => opportunity.candidate.settlementRule.replace(/\s+/g, " ").trim(),
    [opportunity.candidate.settlementRule]
  );

  const createHref = `/vs/create?source=${encodeURIComponent(
    opportunity.candidate.primaryResolutionSource
  )}`;

  return (
    <article className="group relative flex h-full flex-col gap-5 rounded-lg border border-white/[0.12] bg-pv-surface/80 transition-all duration-300 hover:border-white/[0.22] hover:bg-pv-surface/90 overflow-hidden">
      {/* Top bar — serial + badges (document header) */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.06] bg-white/[0.02] sm:px-6">
        <span className="font-mono text-[9px] tracking-[0.15em] text-pv-muted/50 uppercase">
          PV-{opportunity.id.slice(0, 8).toUpperCase()}
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-pv-muted">
            {t(`challengeOpportunitySourceTypes.${opportunity.sourceType}`)}
          </span>
          <span
            className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${
              strengthBadgeClass[opportunity.claimStrengthTier]
            }`}
          >
            {tQuality(`tiers.${opportunity.claimStrengthTier}`)}
          </span>
        </div>
      </div>

      <div className="px-5 sm:px-6 pb-0">

      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-pv-muted">
            {tCat(opportunity.candidate.category)}
          </p>
          <h3 className="mt-2 text-balance font-display text-[1.45rem] font-bold leading-[1.08] tracking-tight text-pv-text sm:text-[1.6rem]">
            {opportunity.candidate.claimText}
          </h3>
        </div>
        <p className="line-clamp-3 text-sm leading-7 text-pv-muted">
          {sourceSummary}
        </p>
      </div>

      <dl className="grid gap-3 rounded-xl border border-white/[0.08] bg-pv-bg/50 p-4 text-sm">
        <div className="flex items-start gap-3">
          <CalendarClock size={16} className="mt-0.5 shrink-0 text-pv-muted" aria-hidden />
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
              {t("challengeOpportunityDeadline")}
            </dt>
            <dd className="mt-1 text-pv-text">{deadlineLabel}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Link2 size={16} className="mt-0.5 shrink-0 text-pv-muted" aria-hidden />
          <div className="min-w-0">
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
              {t("challengeOpportunitySource")}
            </dt>
            <dd className="mt-1 truncate font-medium text-pv-text">
              {sourceHostname}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <FileText size={16} className="mt-0.5 shrink-0 text-pv-muted" aria-hidden />
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
              {tCreate("sourceDraftSettlementRule")}
            </dt>
            <dd className="mt-1 line-clamp-2 leading-6 text-pv-text/90">
              {settlementPreview}
            </dd>
          </div>
        </div>
      </dl>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2.5 px-5 sm:px-6 pb-5 sm:pb-6">
        {opportunity.action === "challenge" && opportunity.existingClaimId ? (
          <>
            <Link
              href={`/vs/${opportunity.existingClaimId}`}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-pv-text px-4 py-3 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-pv-bg transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-px hover:bg-pv-emerald hover:shadow-[0_6px_18px_-4px_rgba(78,222,163,0.35)]"
            >
              {t("challengeOpportunityPrimaryChallenge")}
            </Link>
            <Link
              href={createHref}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-transparent px-4 py-3 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-pv-text transition-colors hover:border-pv-emerald/30 hover:text-pv-emerald"
            >
              {t("challengeOpportunitySecondaryCreate")}
            </Link>
          </>
        ) : (
          <>
            <Link
              href={createHref}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-pv-text px-4 py-3 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-pv-bg transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-px hover:bg-pv-emerald hover:shadow-[0_6px_18px_-4px_rgba(78,222,163,0.35)]"
            >
              {t("challengeOpportunityPrimaryCreate")}
            </Link>
            <a
              href={opportunity.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-transparent px-4 py-3 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-pv-text transition-colors hover:border-pv-emerald/30 hover:text-pv-emerald"
            >
              {t("challengeOpportunityOpenSource")}
              <ArrowUpRight size={14} aria-hidden />
            </a>
          </>
        )}
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </article>
  );
}
