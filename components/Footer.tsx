"use client";

import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-16 border-t border-white/[0.08]">
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Una sola banda: 3 columnas en desktop — izq | centro (Powered) | der (©) */}
        <div className="grid grid-cols-1 items-center gap-5 text-center md:grid-cols-[1fr_auto_1fr] md:gap-6 md:text-left">
          {/* Izquierda: marca */}
          <div className="flex flex-col items-center md:items-start md:justify-self-start">
            <span className="group font-display text-sm font-bold tracking-tight text-pv-emerald transition-colors duration-300 ease-in-out">
              PROVEN
              <span className="text-pv-text group-hover:text-pv-emerald transition-colors duration-300 ease-in-out">.</span>
            </span>
          </div>

          {/* Centro: entre columnas laterales (misma fila en md+) */}
          <p className="justify-self-center text-[10px] leading-snug text-pv-muted/45 md:px-2 md:text-center">
            {t("poweredBy")}
          </p>

          {/* Derecha: copyright */}
          <p className="justify-self-center text-[10px] leading-snug text-pv-muted/40 md:justify-self-end md:text-right">
            {t("rightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
}
