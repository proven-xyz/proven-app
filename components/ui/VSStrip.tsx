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
    <div className="flex rounded-xl overflow-hidden border border-pv-surface2">
      <div className={`flex-1 bg-pv-cyan/[0.03] ${compact ? "px-3 py-2" : "p-4"}`}>
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-cyan/50">
          {t("creator")}
        </div>
        {!compact && (
          <div className="text-sm font-semibold mt-1">
            {shortenAddress(creator)}
          </div>
        )}
        <div
          className={`font-medium text-pv-cyan ${
            compact ? "text-xs mt-0.5" : "text-xs mt-1"
          }`}
        >
          {creatorPosition}
        </div>
      </div>

      <div className="w-px bg-pv-surface2" />

      <div className={`flex-1 bg-pv-fuch/[0.03] ${compact ? "px-3 py-2" : "p-4"}`}>
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-pv-fuch/50">
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
              <div className="text-sm font-semibold mt-1">
                {shortenAddress(opponent)}
              </div>
            )}
            <div
              className={`font-medium text-pv-fuch ${
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
