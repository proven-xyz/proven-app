"use client";

import { useTranslations } from "next-intl";
import { shortenAddress } from "@/lib/constants";

interface VSStripProps {
  creator: string;
  creatorPosition: string;
  opponent: string;
  opponentPosition: string;
  isOpen: boolean;
  compact?: boolean;
}

export default function VSStrip({
  creator,
  creatorPosition,
  opponent,
  opponentPosition,
  isOpen,
  compact = false,
}: VSStripProps) {
  const t = useTranslations("strip");

  return (
    <div className="flex rounded overflow-hidden border border-white/[0.12]">
      <div className={`flex-1 min-w-0 bg-pv-cyan/[0.04] ${compact ? "px-3 py-2" : "p-4"}`}>
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-cyan/60">
          {t("creator")}
        </div>
        {!compact && (
          <div className="text-sm font-semibold mt-1 truncate">
            {shortenAddress(creator)}
          </div>
        )}
        <div
          className={`font-medium text-pv-cyan truncate ${
            compact ? "text-xs mt-0.5" : "text-xs mt-1"
          }`}
        >
          {creatorPosition}
        </div>
      </div>

      <div className="w-px bg-white/[0.08] flex-shrink-0" />

      <div className={`flex-1 min-w-0 bg-pv-fuch/[0.04] ${compact ? "px-3 py-2" : "p-4"}`}>
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-fuch/60">
          {t("rival")}
        </div>
        {isOpen ? (
          <div
            className={`text-pv-muted italic ${
              compact ? "text-xs mt-0.5" : "text-xs mt-1"
            }`}
          >
            {t("waiting")}
          </div>
        ) : (
          <>
            {!compact && (
              <div className="text-sm font-semibold mt-1 truncate">
                {shortenAddress(opponent)}
              </div>
            )}
            <div
              className={`font-medium text-pv-fuch truncate ${
                compact ? "text-xs mt-0.5" : "text-xs mt-1"
              }`}
            >
              {opponentPosition}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
