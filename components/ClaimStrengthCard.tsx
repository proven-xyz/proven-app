"use client";

import { useMemo } from "react";
import { CheckCircle2, CircleDashed, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { useTranslations } from "next-intl";

import { computeClaimQuality, type ClaimQualityInput } from "@/lib/claimQuality";
import { GlassCard } from "@/components/ui";

type ClaimStrengthCardProps = {
  input: ClaimQualityInput;
  moderation?: {
    status: "idle" | "checking" | "allowed" | "blocked";
    message?: string;
  };
  compact?: boolean;
  className?: string;
};

const tierClasses = {
  strong: "border-pv-emerald/35 bg-pv-emerald/[0.12] text-pv-emerald",
  good: "border-pv-cyan/35 bg-pv-cyan/[0.12] text-pv-cyan",
  fair: "border-amber-400/35 bg-amber-400/[0.12] text-amber-300",
  weak: "border-white/[0.14] bg-white/[0.05] text-pv-muted",
} as const;

export default function ClaimStrengthCard({
  input,
  moderation,
  compact = false,
  className = "",
}: ClaimStrengthCardProps) {
  const t = useTranslations("quality");
  const safeT = useMemo(() => {
    return (key: string, values?: Record<string, any>, fallback?: string) => {
      const has = (t as any)?.has;
      if (typeof has === "function") {
        try {
          if (!has(key)) {
            return fallback ?? "";
          }
        } catch {
          // ignore `has` failures and fall back to try/catch translation below
        }
      }
      try {
        // next-intl throws on missing messages; we never want UI to crash for that.
        return values ? (t as any)(key, values) : (t as any)(key);
      } catch {
        return fallback ?? "";
      }
    };
  }, [t]);
  const result = useMemo(() => computeClaimQuality(input), [input]);
  const moderationMessage = useMemo(() => {
    if (!moderation) return "";
    if (typeof moderation.message !== "string" || !moderation.message.trim()) {
      return "";
    }
    const raw = moderation.message.trim();
    if (raw.startsWith("rate_limited:")) {
      const seconds = Number.parseInt(raw.split(":")[1] || "", 10);
      return Number.isFinite(seconds) && seconds > 0
        ? safeT("moderationRateLimited", { seconds }, `Moderation rate-limited. Retry in ${seconds}s.`)
        : safeT("moderationUnavailable", undefined, "Moderation temporarily unavailable.");
    }

    return safeT(
      `moderationBlockedByCode.${raw}`,
      undefined,
      safeT("moderationBlockedGeneric", undefined, "Blocked by policy.")
    );
  }, [moderation, safeT]);

  return (
    <GlassCard
      glass
      glow="none"
      className={`border border-white/[0.12] !rounded-2xl ${className}`}
    >
      <div className={compact ? "space-y-3" : "space-y-4"}>
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-[11px] font-bold uppercase tracking-[0.18em] text-pv-emerald/85">
              {t("claimStrength")}
            </div>
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tierClasses[result.tier]}`}
            >
              {t(`tiers.${result.tier}`)}
            </span>
          </div>
          {!compact ? (
            <p className="mt-2 text-xs leading-relaxed text-pv-muted">
              {t("hint")}
            </p>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
              {t("score")}
            </div>
            <div className="font-display text-3xl font-bold tracking-tight text-pv-text">
              {result.score}
            </div>
          </div>
          <div className="text-right text-[11px] text-pv-muted">
            {t("scoreOutOf")}
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pv-emerald via-pv-cyan to-pv-gold transition-[width] duration-300"
            style={{ width: `${result.score}%` }}
          />
        </div>

        <ul className={`grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`} role="list">
          {result.signals.map((signal) => (
            <li
              key={signal.key}
              className={`flex items-start gap-2 text-xs leading-relaxed ${
                signal.passed ? "text-pv-text/90" : "text-pv-muted"
              }`}
            >
              {signal.passed ? (
                <CheckCircle2
                  size={14}
                  className="mt-0.5 shrink-0 text-pv-emerald"
                  aria-hidden
                />
              ) : (
                <CircleDashed
                  size={14}
                  className="mt-0.5 shrink-0 text-pv-muted/80"
                  aria-hidden
                />
              )}
              <span>{t(`signals.${signal.key}`)}</span>
            </li>
          ))}
        </ul>

        {moderation ? (
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.03] px-3 py-2">
            <div className="flex items-start gap-2 text-xs leading-relaxed">
              {moderation.status === "allowed" ? (
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-pv-emerald" aria-hidden />
              ) : moderation.status === "blocked" ? (
                <ShieldX size={14} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
              ) : (
                <ShieldAlert size={14} className="mt-0.5 shrink-0 text-pv-muted" aria-hidden />
              )}
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted">
                  {safeT("moderationLabel", undefined, "Moderation")}
                </div>
                <div
                  className={
                    moderation.status === "checking"
                      ? "text-amber-200 animate-pulse"
                      : moderation.status === "blocked"
                        ? "text-amber-200"
                        : "text-pv-muted"
                  }
                >
                  {moderationMessage ||
                    (moderation.status === "checking"
                      ? safeT("moderationAnalyzing", undefined, "Analyzing with AI…")
                      : moderation.status === "allowed"
                        ? safeT("moderationAllowed", undefined, "Allowed by policy.")
                        : moderation.status === "blocked"
                          ? safeT("moderationBlockedGeneric", undefined, "Blocked by policy.")
                          : safeT("moderationIdle", undefined, "Complete the claim to run a policy check."))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}
