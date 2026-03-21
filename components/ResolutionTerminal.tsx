"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import GlassCard from "./ui/GlassCard";

interface ResolutionTerminalProps {
  phase: number;
  url: string;
}

export default function ResolutionTerminal({
  phase,
  url,
}: ResolutionTerminalProps) {
  const t = useTranslations("terminal");

  const steps = [
    t("searchingEvidence"),
    t("analyzing", { url }),
    t("comparingSources"),
    t("issuingVerdict"),
  ];

  return (
    <GlassCard className="mb-6">
      <div className="p-2 text-center">
        <div className="w-14 h-14 rounded-full border-[3px] border-transparent border-t-pv-emerald animate-spin mx-auto mb-5" />

        <div className="font-mono text-sm text-pv-emerald text-left leading-[2.2]">
          {steps.map((text, i) => {
            const isLast = i === steps.length - 1;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0.15 }}
                animate={{ opacity: phase >= i ? 1 : 0.15 }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-pv-emerald/40 mr-1">&gt;</span> {text}
                {isLast && phase >= i && (
                  <span className="animate-blink">_</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}
