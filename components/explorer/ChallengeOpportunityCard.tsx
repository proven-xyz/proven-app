"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, Globe, Sparkles, Timer } from "lucide-react";

import type { ChallengeOpportunity } from "@/lib/claimDrafts";

type ChallengeOpportunityCardProps = {
  opportunity: ChallengeOpportunity;
};

const CATEGORY_ACCENTS = {
  sports: {
    accent: "#4ea8de",
    dim: "rgba(78,168,222,0.12)",
    border: "rgba(78,168,222,0.28)",
  },
  weather: {
    accent: "#67d7f7",
    dim: "rgba(103,215,247,0.12)",
    border: "rgba(103,215,247,0.28)",
  },
  crypto: {
    accent: "#f0c040",
    dim: "rgba(240,192,64,0.12)",
    border: "rgba(240,192,64,0.28)",
  },
  culture: {
    accent: "#f38ac9",
    dim: "rgba(243,138,201,0.12)",
    border: "rgba(243,138,201,0.28)",
  },
  custom: {
    accent: "#b48efa",
    dim: "rgba(180,142,250,0.12)",
    border: "rgba(180,142,250,0.28)",
  },
} as const;

function getCategoryAccent(category: ChallengeOpportunity["candidate"]["category"]) {
  return CATEGORY_ACCENTS[category] ?? CATEGORY_ACCENTS.custom;
}

function ConfidenceMeter({ score, label }: { score: number; label: string }) {
  const normalizedScore = Math.max(18, Math.min(100, score));

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.08]">
        <span
          className="block h-full rounded-full bg-current transition-[width] duration-500"
          style={{ width: `${normalizedScore}%` }}
        />
      </span>
      <span>{label}</span>
    </span>
  );
}

function resolveConfidenceKey(score: number) {
  if (score >= 80) {
    return "high";
  }
  if (score >= 60) {
    return "medium";
  }
  return "low";
}

function resolveConfidenceClass(score: number) {
  if (score >= 80) {
    return "text-pv-emerald";
  }
  if (score >= 60) {
    return "text-pv-cyan";
  }
  return "text-pv-gold";
}

export default function ChallengeOpportunityCard({
  opportunity,
}: ChallengeOpportunityCardProps) {
  const t = useTranslations("explore");
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

  const settlementPreview = useMemo(
    () =>
      opportunity.candidate.settlementRule.replace(/\s+/g, " ").trim(),
    [opportunity.candidate.settlementRule]
  );

  const createHref = `/vs/create?source=${encodeURIComponent(
    opportunity.candidate.primaryResolutionSource
  )}`;
  const confidenceKey = resolveConfidenceKey(opportunity.candidate.confidenceScore);
  const confidenceLabel = t(
    `confidence${confidenceKey[0].toUpperCase()}${confidenceKey.slice(1)}`
  );
  const categoryAccent = getCategoryAccent(opportunity.candidate.category);
  const categoryLabel = tCat(opportunity.candidate.category).toUpperCase();

  return (
    <article
      className="group relative flex h-full flex-col gap-2.5 overflow-hidden rounded-2xl border border-white/[0.1] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 shadow-[0_10px_28px_-20px_rgba(0,0,0,0.82),0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-xl transition-[border-color,background-color,transform,box-shadow] duration-300 hover:-translate-y-[2px] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]"
      style={
        {
          "--op-accent": categoryAccent.accent,
          "--op-accent-dim": categoryAccent.dim,
          "--op-accent-border": categoryAccent.border,
          borderColor: "rgba(255,255,255,0.1)",
          boxShadow: `0 10px 28px -20px rgba(0,0,0,0.82), 0 0 0 1px rgba(255,255,255,0.02)`,
        } as React.CSSProperties
      }
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = categoryAccent.border;
        event.currentTarget.style.boxShadow = `0 18px 42px -26px rgba(0,0,0,0.92), 0 0 0 1px ${categoryAccent.border}, 0 0 26px -18px ${categoryAccent.accent}`;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        event.currentTarget.style.boxShadow =
          "0 10px 28px -20px rgba(0,0,0,0.82), 0 0 0 1px rgba(255,255,255,0.02)";
      }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle, ${categoryAccent.dim} 0%, transparent 68%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0))",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--op-accent)] to-transparent opacity-70"
        aria-hidden
      />

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-pv-muted">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1"
            style={{
              color: categoryAccent.accent,
              backgroundColor: categoryAccent.dim,
              borderColor: categoryAccent.border,
            }}
          >
            <Sparkles size={10} aria-hidden />
            <span>{categoryLabel}</span>
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="whitespace-nowrap">{t("aiOpportunityConfidence")}:</span>
          <span className={resolveConfidenceClass(opportunity.candidate.confidenceScore)}>
            <ConfidenceMeter
              score={opportunity.candidate.confidenceScore}
              label={confidenceLabel}
            />
          </span>
        </span>
      </div>

      <div className="space-y-2.5">
        <h3 className="text-balance font-display text-[1.12rem] font-bold leading-[1.18] tracking-[-0.025em] text-pv-text sm:text-[1.28rem]">
          {opportunity.candidate.claimText}
        </h3>

        <dl className="grid grid-cols-1 gap-2 rounded-2xl border border-white/[0.08] bg-black/20 p-3 sm:grid-cols-2">
          <div>
            <dt className="inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-pv-muted">
              <Timer size={10} className="text-pv-muted/75" aria-hidden />
              {t("challengeOpportunityDeadline")}
            </dt>
            <dd className="mt-1 text-[13px] leading-5 text-pv-text">{deadlineLabel}</dd>
          </div>
          <div>
            <dt className="inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-pv-muted">
              <Globe size={10} className="text-pv-muted/75" aria-hidden />
              {t("aiOpportunitySourceDomain")}
            </dt>
            <dd className="mt-1 truncate text-[13px] leading-5 text-pv-text">{sourceHostname}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-pv-muted">
              {t("aiOpportunitySourceTrust")}
            </dt>
            <dd className="mt-1 text-[13px] leading-5 text-pv-text">
              {t(`challengeOpportunitySourceTypes.${opportunity.sourceType}`)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-pv-muted">
              {t("aiOpportunitySettlementBasis")}
            </dt>
            <dd className="mt-1 line-clamp-2 text-[13px] leading-5 text-pv-text/88">
              {settlementPreview}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-0">
        <Link
          href={createHref}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-pv-emerald px-4 py-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-pv-bg transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-px hover:bg-[#5ef0b3] hover:shadow-[0_10px_28px_-12px_rgba(78,222,163,0.7)]"
        >
          {t("challengeOpportunityPrimaryCreate")}
        </Link>
        <a
          href={opportunity.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-black/20 px-4 py-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-pv-text transition-colors hover:border-white/[0.24] hover:bg-white/[0.05]"
        >
          {t("challengeOpportunityOpenSource")}
          <ExternalLink size={14} aria-hidden />
        </a>
      </div>
    </article>
  );
}
