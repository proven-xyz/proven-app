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
  variant?: "default" | "minimal";
};

export default function ChallengeOpportunityCard({
  opportunity,
  variant = "default",
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

  const cardChrome =
    variant === "minimal"
      ? "rounded-xl border border-white/[0.10] bg-pv-surface/55 hover:border-white/[0.18] hover:bg-pv-surface/65"
      : "rounded-lg border border-white/[0.12] bg-pv-surface/80 hover:border-white/[0.22] hover:bg-pv-surface/90";

  const headerChrome =
    variant === "minimal"
      ? "border-b border-white/[0.06] bg-transparent"
      : "border-b border-white/[0.06] bg-white/[0.02]";

  const softPanel =
    variant === "minimal"
      ? "border-white/[0.06] bg-pv-bg/32"
      : "border-white/[0.08] bg-pv-bg/50";

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden transition-all duration-300 ${cardChrome}`}
    >
      {/* Accent rail (minimal only) */}
      {variant === "minimal" ? (
        <div
          className="pointer-events-none absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-pv-emerald/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />
      ) : null}

      {/* Top bar — serial + badges (document header) */}
      <div className={`flex items-center justify-between px-5 py-2.5 sm:px-6 ${headerChrome}`}>
        <span className="font-mono text-[9px] tracking-[0.15em] text-pv-muted/50 uppercase">
          PV-{opportunity.id.slice(0, 8).toUpperCase()}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${
              variant === "minimal"
                ? "border-white/[0.10] bg-white/[0.03] text-pv-muted"
                : "border-white/[0.12] bg-white/[0.04] text-pv-muted"
            }`}
          >
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

      <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 sm:px-6 sm:pt-5">
        <div className="space-y-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-pv-muted">
              {tCat(opportunity.candidate.category)}
            </p>
            <h3
              className={`mt-2 text-balance font-display font-bold leading-[1.08] tracking-tight text-pv-text ${
                variant === "minimal"
                  ? "text-[1.35rem] sm:text-[1.5rem]"
                  : "text-[1.45rem] sm:text-[1.6rem]"
              }`}
            >
              {opportunity.candidate.claimText}
            </h3>
          </div>
          <p
            className={`text-sm leading-7 text-pv-muted ${
              variant === "minimal" ? "line-clamp-2" : "line-clamp-3"
            }`}
          >
            {sourceSummary}
          </p>
        </div>

        <div className="mt-4 grid flex-1 items-stretch gap-3 lg:grid-cols-2 min-h-0">
          <dl
            className={`grid rounded-xl border p-4 text-sm ${softPanel} ${
              variant === "minimal" ? "gap-4 sm:grid-cols-2" : "gap-3"
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
                  {t("challengeOpportunityDeadline")}
                </dt>
                <CalendarClock
                  size={16}
                  className="mt-0.5 shrink-0 text-pv-muted"
                  aria-hidden
                />
              </div>
              <dd className="mt-1 text-[12px] text-pv-text">{deadlineLabel}</dd>
            </div>
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
                  {t("challengeOpportunitySource")}
                </dt>
                <Link2
                  size={16}
                  className="mt-0.5 shrink-0 text-pv-muted"
                  aria-hidden
                />
              </div>
              <dd className="mt-1 truncate text-[12px] font-medium text-pv-text">
                {sourceHostname}
              </dd>
            </div>
          </dl>

          <div className={`flex h-full flex-col rounded-xl border p-4 ${softPanel}`}>
            <div className="min-w-0 flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
                  {tCreate("sourceDraftSettlementRule")}
                </div>
                <FileText
                  size={16}
                  className="mt-0.5 shrink-0 text-pv-muted"
                  aria-hidden
                />
              </div>
              <div
                className={`mt-1 flex-1 text-[12px] leading-6 text-pv-text/90 ${
                  variant === "minimal" ? "" : "line-clamp-2"
                }`}
              >
                {settlementPreview}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
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
