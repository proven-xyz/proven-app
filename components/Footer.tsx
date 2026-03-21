"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-white/[0.08] mt-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <div>
            <span className="font-display font-bold text-sm tracking-tight text-pv-muted">
              PROVEN<span className="text-pv-emerald">.</span>
            </span>
            <p className="text-[11px] text-pv-muted/60 mt-1">
              {t("tagline")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/explore"
              className="text-xs text-pv-muted hover:text-pv-text transition-colors"
            >
              {t("explore")}
            </Link>
            <Link
              href="/vs/create"
              className="text-xs text-pv-muted hover:text-pv-text transition-colors"
            >
              {t("createVS")}
            </Link>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-white/[0.06]">
          <p className="text-[10px] text-pv-muted/40 text-center">
            {t("poweredBy")}
          </p>
        </div>
      </div>
    </footer>
  );
}
