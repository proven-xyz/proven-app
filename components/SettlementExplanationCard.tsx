"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, FileCheck2, ShieldCheck, Scale, ScrollText } from "lucide-react";

import { GlassCard } from "@/components/ui";
import { formatDeadline, normalizeResolutionSource } from "@/lib/constants";
import type { VSData } from "@/lib/contract";

type SettlementExplanationCardProps = {
  vs: VSData;
  className?: string;
};

type ConfidenceTier = "high" | "medium" | "low";

function getConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 80) {
    return "high";
  }
  if (confidence >= 60) {
    return "medium";
  }
  return "low";
}

const confidenceClasses: Record<ConfidenceTier, string> = {
  high: "border-pv-emerald/35 bg-pv-emerald/[0.12] text-pv-emerald",
  medium: "border-pv-cyan/35 bg-pv-cyan/[0.12] text-pv-cyan",
  low: "border-amber-400/35 bg-amber-400/[0.12] text-amber-300",
};

export default function SettlementExplanationCard({
  vs,
  className = "",
}: SettlementExplanationCardProps) {
  const t = useTranslations("settlement");
  const locale = useLocale();

  const normalizedSource = useMemo(
    () => normalizeResolutionSource(vs.resolution_url),
    [vs.resolution_url]
  );

  const sourceHost = useMemo(() => {
    if (!normalizedSource) {
      return t("unknownSource");
    }

    try {
      return new URL(normalizedSource).hostname.replace(/^www\./i, "");
    } catch {
      return normalizedSource;
    }
  }, [normalizedSource, t]);

  const confidence = typeof vs.confidence === "number" ? vs.confidence : 0;
  const confidenceTier = getConfidenceTier(confidence);

  const outcomeLabel =
    vs.winner_side === "creator"
      ? t("outcomes.creator")
      : vs.winner_side === "challengers"
        ? t("outcomes.challengers")
        : vs.winner_side === "draw"
          ? t("outcomes.draw")
          : t("outcomes.unresolvable");

  const summary = vs.resolution_summary?.trim() || t("noSummary");
  const settlementRule = vs.settlement_rule?.trim() || t("ruleFallback");

  return (
    <GlassCard
      glass
      glow="none"
      className={`border border-white/[0.12] !rounded-2xl ${className}`}
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-pv-emerald/85">
              {t("title")}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-pv-muted">
              {t("hint")}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${confidenceClasses[confidenceTier]}`}
          >
            {t(`confidenceTiers.${confidenceTier}`)}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-pv-surface2 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-pv-emerald/80">
                <Scale size={14} />
                {t("verdict")}
              </div>
              <div className="text-lg font-semibold text-pv-text">{outcomeLabel}</div>
              <p className="mt-2 text-sm leading-relaxed text-pv-muted">{summary}</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-pv-surface2 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-pv-cyan/80">
                <ScrollText size={14} />
                {t("ruleApplied")}
              </div>
              <p className="text-sm leading-relaxed text-pv-text/90">{settlementRule}</p>
              <p className="mt-2 text-xs leading-relaxed text-pv-muted">
                {t("consensusHint")}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-pv-surface2 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-pv-fuch/80">
                <FileCheck2 size={14} />
                {t("evidence")}
              </div>
              <div className="text-sm font-semibold text-pv-text">{sourceHost}</div>
              <p className="mt-2 text-xs leading-relaxed text-pv-muted">
                {t("evidenceHint")}
              </p>
              {normalizedSource ? (
                <a
                  href={normalizedSource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-pv-cyan hover:text-pv-text transition-colors"
                >
                  <ExternalLink size={12} />
                  {t("openSource")}
                </a>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-pv-surface2 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-pv-gold/80">
                <ShieldCheck size={14} />
                {t("confidence")}
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="font-display text-3xl font-bold tracking-tight text-pv-text">
                  {confidence}
                </div>
                <div className="text-right text-[11px] text-pv-muted">
                  {t("scoreOutOf")}
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-pv-cyan to-pv-emerald transition-[width] duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, confidence))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-pv-muted">
            {t("receipt")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.08] bg-pv-surface2 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                {t("receiptOutcome")}
              </div>
              <div className="text-sm font-semibold text-pv-text">{outcomeLabel}</div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-pv-surface2 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                {t("receiptSource")}
              </div>
              <div className="text-sm font-semibold text-pv-text break-all">{sourceHost}</div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-pv-surface2 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                {t("receiptDeadline")}
              </div>
              <div className="text-sm font-semibold text-pv-text">
                {formatDeadline(vs.deadline, locale)}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-pv-surface2 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-muted mb-1.5">
                {t("receiptConfidence")}
              </div>
              <div className="text-sm font-semibold text-pv-text">
                {confidence}/100
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
