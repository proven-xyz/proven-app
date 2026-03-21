"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import { shortenAddress } from "@/lib/constants";
import { Menu, X } from "lucide-react";

export default function Header() {
  const { address, isConnected, isConnecting, connect, disconnect } =
    useWallet();
  const pathname = usePathname();
  const locale = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t  = useTranslations("header");
  const tc = useTranslations("common");

  const NAV_ITEMS = [
    { href: "/vs/create" as const, label: t("challenge"), accent: true },
    { href: "/explore"   as const, label: t("explore") },
    { href: "/dashboard" as const, label: t("myVS") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-pv-surface/75 backdrop-blur-[20px]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="font-display font-bold text-[17px] tracking-tight">
            PROVEN
            <motion.span
              className="text-pv-emerald inline-block text-[1.38em] leading-none ml-[1px]"
              whileHover={{ scale: 1.3, rotate: -8 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              .
            </motion.span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          {isConnected &&
            NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`chip text-[13px] transition-all relative ${
                    item.accent
                      ? "text-pv-emerald border-pv-emerald/[0.28] bg-pv-emerald/[0.08]"
                      : isActive
                      ? "text-pv-text border-white/[0.32] bg-white/[0.06]"
                      : "text-pv-muted hover:text-pv-text hover:border-white/[0.22]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

          {/* Language switcher */}
          <div className="flex items-center gap-1 text-xs font-mono">
            <Link
              href={pathname || "/"}
              locale="es"
              className={`px-1 transition-colors ${
                locale === "es"
                  ? "text-pv-text font-bold"
                  : "text-pv-muted hover:text-pv-text"
              }`}
            >
              ES
            </Link>
            <span className="text-pv-border">|</span>
            <Link
              href={pathname || "/"}
              locale="en"
              className={`px-1 transition-colors ${
                locale === "en"
                  ? "text-pv-text font-bold"
                  : "text-pv-muted hover:text-pv-text"
              }`}
            >
              EN
            </Link>
          </div>

          {isConnected ? (
            <button
              onClick={disconnect}
              className="chip font-mono text-[11px] text-pv-emerald border-pv-emerald/[0.25] focus-ring"
            >
              {shortenAddress(address!)}
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="px-4 py-1.5 rounded bg-pv-emerald text-pv-bg text-[13px] font-bold cursor-pointer focus-ring transition-all hover:brightness-110 disabled:opacity-50"
            >
              {isConnecting ? "..." : tc("connect")}
            </button>
          )}
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <div className="flex items-center gap-0.5 text-[10px] font-mono">
            <Link
              href={pathname || "/"}
              locale="es"
              className={`px-0.5 ${locale === "es" ? "text-pv-text font-bold" : "text-pv-muted"}`}
            >
              ES
            </Link>
            <span className="text-pv-border">|</span>
            <Link
              href={pathname || "/"}
              locale="en"
              className={`px-0.5 ${locale === "en" ? "text-pv-text font-bold" : "text-pv-muted"}`}
            >
              EN
            </Link>
          </div>

          {isConnected ? (
            <button
              onClick={disconnect}
              className="chip font-mono text-[10px] text-pv-emerald border-pv-emerald/[0.25]"
            >
              {shortenAddress(address!)}
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="px-3 py-1.5 rounded bg-pv-emerald text-pv-bg text-[12px] font-bold"
            >
              {isConnecting ? "..." : tc("connect")}
            </button>
          )}
          {isConnected && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 rounded text-pv-muted hover:text-pv-text transition-colors"
              aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {mobileOpen && isConnected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-white/[0.08] overflow-hidden"
          >
            <nav className="px-5 py-3 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`px-4 py-3 rounded text-sm font-semibold transition-colors ${
                      item.accent
                        ? "text-pv-emerald bg-pv-emerald/[0.08]"
                        : isActive
                        ? "text-pv-text bg-pv-text/[0.04]"
                        : "text-pv-muted hover:text-pv-text"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
