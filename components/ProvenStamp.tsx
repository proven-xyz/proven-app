"use client";

import { motion } from "framer-motion";
import GlassCard from "./ui/GlassCard";
import { shortenAddress } from "@/lib/constants";

interface ProvenStampProps {
  winner: string;
  hasWinner: boolean;
  stakeAmount: number;
  resolutionSummary?: string;
}

export default function ProvenStamp({
  winner,
  hasWinner,
  stakeAmount,
  resolutionSummary,
}: ProvenStampProps) {
  return (
    <GlassCard glow="both" className="animate-pulse-glow mb-6">
      <div className="p-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-[11px] font-bold uppercase tracking-[0.2em] text-pv-emerald mb-5"
        >
          PROVEN ya decidió
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 2.5, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: -12 }}
          transition={{
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="inline-block px-8 py-3 rounded-lg border-[3px] border-pv-emerald text-pv-emerald font-display text-3xl font-bold uppercase tracking-widest shadow-glow-emerald-lg mb-6"
        >
          PROVEN.
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="font-display text-2xl font-bold mb-3"
        >
          {hasWinner ? `Ganó @${shortenAddress(winner)}` : "Empate"}
        </motion.h2>

        {hasWinner && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="font-mono text-3xl font-bold text-pv-gold mb-5 [text-shadow:0_0_20px_rgba(251,191,36,0.4)]"
          >
            +${stakeAmount * 2}
          </motion.div>
        )}

        {resolutionSummary && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-sm text-pv-muted leading-relaxed"
          >
            {resolutionSummary}
          </motion.p>
        )}
      </div>
    </GlassCard>
  );
}
