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
  const t = useTranslations("header");
  const tc = useTranslations("common");

  const NAV_ITEMS = [
    { href: "/vs/create" as const, label: t("challenge"), accent: true },
    { href: "/explore" as const, label: t("explore") },
    { href: "/dashboard" as const, label: t("myVS") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-pv-surface bg-pv-bg/92 backdrop-blur-2xl">
      <div className="max-w-[640px] mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="font-display font-bold text-[17px] tracking-tight">
            PROVEN
            <motion.span
              className="text-pv-emerald inline-block"
              whileHover={{ scale: 1.3, rotate: -8 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              .
            </motion.span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-2">
          {isConnected &&
            NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`chip text-[13px] transition-all relative ${
                    item.accent
                      ? "text-pv-cyan border-pv-cyan/15 bg-pv-cyan/[0.06]"
                      : isActive
                      ? "text-pv-text border-pv-text/10 bg-pv-text/[0.06]"
                      : "text-pv-muted hover:text-pv-text"
                  }`}
                >
                  {item.label}
                  {isActive && !item.accent && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-px left-2 right-2 h-0.5 bg-pv-text rounded-full"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
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
              className="chip font-mono text-[11px] text-pv-emerald border-pv-emerald/12 focus-ring"
            >
              {shortenAddress(address!)}
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="px-4 py-1.5 rounded-[10px] bg-pv-text text-pv-bg text-[13px] font-bold border-none cursor-pointer focus-ring transition-opacity hover:opacity-90"
            >
              {isConnecting ? "..." : tc("connect")}
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          {/* Language switcher mobile */}
          <div className="flex items-center gap-0.5 text-[10px] font-mono">
            <Link
              href={pathname || "/"}
              locale="es"
              className={`px-0.5 ${
                locale === "es" ? "text-pv-text font-bold" : "text-pv-muted"
              }`}
            >
              ES
            </Link>
            <span className="text-pv-border">|</span>
            <Link
              href={pathname || "/"}
              locale="en"
              className={`px-0.5 ${
                locale === "en" ? "text-pv-text font-bold" : "text-pv-muted"
              }`}
            >
              EN
            </Link>
          </div>

          {isConnected ? (
            <button
              onClick={disconnect}
              className="chip font-mono text-[10px] text-pv-emerald border-pv-emerald/12"
            >
              {shortenAddress(address!)}
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="px-3 py-1.5 rounded-[10px] bg-pv-text text-pv-bg text-[12px] font-bold"
            >
              {isConnecting ? "..." : tc("connect")}
            </button>
          )}
          {isConnected && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 rounded-lg text-pv-muted hover:text-pv-text transition-colors"
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
            className="sm:hidden border-t border-pv-surface2 overflow-hidden"
          >
            <nav className="px-5 py-3 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      item.accent
                        ? "text-pv-cyan bg-pv-cyan/[0.06]"
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
