"use client";

import { useTranslations } from "next-intl";

interface BadgeProps {
  status: string;
  large?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  open: "pv-cyan",
  accepted: "pv-fuch",
  resolved: "pv-emerald",
  won: "pv-emerald",
  lost: "pv-danger",
  draw: "pv-muted",
  cancelled: "zinc-500",
};

const colorMap: Record<string, string> = {
  "pv-cyan": "bg-pv-cyan/10 text-pv-cyan border-pv-cyan/20",
  "pv-fuch": "bg-pv-fuch/10 text-pv-fuch border-pv-fuch/20",
  "pv-emerald": "bg-pv-emerald/10 text-pv-emerald border-pv-emerald/20",
  "pv-danger": "bg-pv-danger/10 text-pv-danger border-pv-danger/20",
  "pv-muted": "bg-pv-muted/10 text-pv-muted border-pv-muted/20",
  "pv-gold": "bg-pv-gold/10 text-pv-gold border-pv-gold/20",
  "zinc-500": "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

export default function Badge({ status, large = false }: BadgeProps) {
  const t = useTranslations("badges");
  const color = STATUS_COLORS[status] ?? "pv-muted";
  const classes = colorMap[color] ?? colorMap["pv-muted"];
  const label = t(status as any);

  return (
    <span
      className={`inline-block border font-bold uppercase tracking-[0.12em] rounded-full ${classes} ${
        large ? "px-3.5 py-1.5 text-[11px]" : "px-2.5 py-1 text-[10px]"
      }`}
    >
      {label}
    </span>
  );
}
