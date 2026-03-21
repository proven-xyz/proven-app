"use client";

import { motion } from "framer-motion";
import GlassCard from "./ui/GlassCard";

interface ResolutionTerminalProps {
  phase: number;
  url: string;
}

const STEPS = [
  "IA buscando pruebas...",
  (url: string) => `Analizando ${url}...`,
  "Comparando fuentes...",
  "Emitiendo veredicto",
];

export default function ResolutionTerminal({
  phase,
  url,
}: ResolutionTerminalProps) {
  return (
    <GlassCard className="mb-6">
      <div className="p-2 text-center">
        <div className="w-14 h-14 rounded-full border-[3px] border-transparent border-t-pv-emerald animate-spin mx-auto mb-5" />

        <div className="font-mono text-sm text-pv-emerald text-left leading-[2.2]">
          {STEPS.map((step, i) => {
            const text = typeof step === "function" ? step(url) : step;
            const isLast = i === STEPS.length - 1;
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
