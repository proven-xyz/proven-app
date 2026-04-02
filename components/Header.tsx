"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useWallet } from "@/lib/wallet";
import { shortenAddress } from "@/lib/constants";
import { getWalletChainParams } from "@/lib/genlayer";
import HeaderNetworkStatus from "@/components/HeaderNetworkStatus";
import { Menu, X } from "lucide-react";
import { isXmtpFeatureEnabled } from "@/lib/xmtp/config";

function shortenNetworkName(networkName: string) {
  return networkName
    .replace(/^GenLayer\s+/i, "")
    .replace(/\s+Testnet(?:\s+Chain)?$/i, "")
    .trim();
}

function formatAddNetworkLabel(template: string, networkName: string) {
  if (/Bradbury Network/i.test(template)) {
    return template.replace(/Bradbury Network/gi, `${networkName} Network`);
  }
  if (/Bradbury/i.test(template)) {
    return template.replace(/Bradbury/gi, networkName);
  }
  return `${template} ${networkName}`.trim();
}

function WalletAccountMenu({
  address,
  open,
  onOpenChange,
  onDisconnect,
  containerRef,
  buttonClassName,
}: {
  address: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onDisconnect: () => void;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  buttonClassName: string;
}) {
  const t = useTranslations("header");
  const addNetworkLabel = formatAddNetworkLabel(
    t("addNetwork"),
    shortenNetworkName(getWalletChainParams().chainName)
  );

  async function handleAddNetwork() {
    const ethereum = typeof window !== "undefined" ? (window as any).ethereum : null;
    if (!ethereum) return;
    try {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [getWalletChainParams()],
      });
    } catch { /* user rejected or already added */ }
    onOpenChange(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("walletMenu")}
        className={buttonClassName}
      >
        {shortenAddress(address)}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+6px)] z-[60] min-w-[180px] overflow-hidden rounded-lg border border-white/[0.12] bg-pv-surface/95 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleAddNetwork}
              className="w-full px-3 py-2.5 text-left text-[13px] font-medium text-pv-muted transition-colors hover:bg-white/[0.06] hover:text-pv-text"
            >
              {addNetworkLabel}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onDisconnect();
                onOpenChange(false);
              }}
              className="w-full px-3 py-2.5 text-left text-[13px] font-medium text-pv-muted transition-colors hover:bg-white/[0.06] hover:text-pv-text"
            >
              {t("disconnect")}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function Header() {
  const { address, isConnected, isConnecting, isCorrectNetwork, connect, disconnect, switchNetwork } =
    useWallet();
  const pathname = usePathname();
  const locale = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const walletMenuDesktopRef = useRef<HTMLDivElement>(null);
  const walletMenuMobileRef = useRef<HTMLDivElement>(null);

  const t = useTranslations("header");
  const tc = useTranslations("common");

  /**
   * Solo en la landing del producto: nav derecho mínimo (Explorer + idioma).
   * En el resto de rutas (p. ej. /explorer) se muestran todos los enlaces de app.
   */
  const isPresentationHome = pathname === "/";

  const xmtpNavEnabled = useMemo(() => isXmtpFeatureEnabled(), []);

  const NAV_ITEMS = useMemo(() => {
    const items: Array<{
      href: "/vs/create" | "/explorer" | "/dashboard" | "/messages";
      label: string;
      accent: boolean;
      mobileLabel?: string;
    }> = [
      { href: "/vs/create", label: t("challenge"), accent: true },
      { href: "/explorer", label: t("explore"), accent: false },
      { href: "/dashboard", label: t("myVS"), accent: false },
    ];
    if (xmtpNavEnabled) {
      items.push({
        href: "/messages",
        label: t("messages"),
        accent: false,
        mobileLabel: t("messagesMobile"),
      });
    }
    return items;
  }, [t, xmtpNavEnabled]);

  useEffect(() => {
    if (!walletMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = e.target as Node;
      if (
        walletMenuDesktopRef.current?.contains(el) ||
        walletMenuMobileRef.current?.contains(el)
      ) {
        return;
      }
      setWalletMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [walletMenuOpen]);

  useEffect(() => {
    if (!walletMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWalletMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [walletMenuOpen]);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.08] bg-pv-surface/75 pt-[env(safe-area-inset-top)] backdrop-blur-[20px]">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="group font-display text-lg font-bold tracking-tight text-pv-emerald transition-colors duration-300 ease-in-out sm:text-xl">
            PROVEN
            <span
              className="ml-[1px] inline-block origin-center leading-none text-pv-text transition-[color,transform] duration-300 ease-out will-change-transform group-hover:scale-[1.22] group-hover:-rotate-6 group-hover:text-pv-emerald"
              aria-hidden
            >
              .
            </span>
          </span>
        </Link>

        {isPresentationHome ? (
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1 font-mono text-[10px] sm:text-xs">
              <Link
                href={pathname || "/"}
                locale="es"
                className={`px-1 transition-colors ${
                  locale === "es"
                    ? "font-bold text-pv-text"
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
                    ? "font-bold text-pv-text"
                    : "text-pv-muted hover:text-pv-text"
                }`}
                >
                  EN
                </Link>
              </div>
            <Link
              href="/explorer"
              className="btn-compact-primary px-4 py-1.5 text-[12px] focus-ring sm:text-[13px]"
            >
              {t("explore")}
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop nav */}
            <div className="hidden items-center gap-2 md:flex lg:gap-3">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`chip relative text-[13px] transition-all ${
                      item.accent
                        ? "border-pv-emerald/[0.28] bg-pv-emerald/[0.08] text-pv-emerald"
                        : isActive
                        ? "border-white/[0.32] bg-white/[0.06] text-pv-text"
                        : "text-pv-muted hover:border-white/[0.22] hover:text-pv-text"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {/* Language switcher */}
              <div className="flex items-center gap-1 font-mono text-xs">
                <Link
                  href={pathname || "/"}
                  locale="es"
                  className={`px-1 transition-colors ${
                    locale === "es"
                      ? "font-bold text-pv-text"
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
                      ? "font-bold text-pv-text"
                      : "text-pv-muted hover:text-pv-text"
                  }`}
                >
                  EN
                </Link>
              </div>

              {isConnected && !isCorrectNetwork && (
                <button
                  type="button"
                  onClick={() => void switchNetwork()}
                  className="chip text-[11px] font-bold border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-colors"
                >
                  {t("wrongNetwork")}
                </button>
              )}
              {isConnected && address ? (
                <div className="flex items-center gap-2">
                  <HeaderNetworkStatus enabled={isCorrectNetwork} />
                  <WalletAccountMenu
                    address={address}
                    open={walletMenuOpen}
                    onOpenChange={setWalletMenuOpen}
                    onDisconnect={disconnect}
                    containerRef={walletMenuDesktopRef}
                    buttonClassName="chip font-mono text-[11px] text-pv-emerald border-pv-emerald/[0.25] focus-ring"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={connect}
                  disabled={isConnecting}
                  className="btn-compact-primary px-4 py-1.5 text-[13px] focus-ring"
                >
                  {isConnecting ? "..." : tc("connect")}
                </button>
              )}
            </div>

            {/* Mobile */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex items-center gap-0.5 font-mono text-[10px]">
                <Link
                  href={pathname || "/"}
                  locale="es"
                  className={`px-0.5 ${locale === "es" ? "font-bold text-pv-text" : "text-pv-muted"}`}
                >
                  ES
                </Link>
                <span className="text-pv-border">|</span>
                <Link
                  href={pathname || "/"}
                  locale="en"
                  className={`px-0.5 ${locale === "en" ? "font-bold text-pv-text" : "text-pv-muted"}`}
                >
                  EN
                </Link>
              </div>

              {isConnected && !isCorrectNetwork && (
                <button
                  type="button"
                  onClick={() => void switchNetwork()}
                  className="chip text-[10px] font-bold border-amber-400/40 bg-amber-400/10 text-amber-300"
                >
                  {t("wrongNetwork")}
                </button>
              )}
              {isConnected && address ? (
                <div className="flex items-center gap-1.5">
                  <HeaderNetworkStatus enabled={isCorrectNetwork} compact />
                  <WalletAccountMenu
                    address={address}
                    open={walletMenuOpen}
                    onOpenChange={setWalletMenuOpen}
                    onDisconnect={disconnect}
                    containerRef={walletMenuMobileRef}
                    buttonClassName="chip font-mono text-[10px] text-pv-emerald border-pv-emerald/[0.25]"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={connect}
                  disabled={isConnecting}
                  className="btn-compact-primary px-3 py-1.5 text-[12px]"
                >
                  {isConnecting ? "..." : tc("connect")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="rounded p-1.5 text-pv-muted transition-colors hover:text-pv-text"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {!isPresentationHome && mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/[0.08] md:hidden"
          >
            <LayoutGroup id="mobile-header-nav">
              <nav
                className="flex flex-col gap-0.5 px-5 py-3"
                aria-label={t("mobileNavAria")}
              >
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  const label = item.accent
                    ? t("challengeMobile")
                    : item.mobileLabel ?? item.label;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`relative block overflow-hidden rounded-lg px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pv-emerald/35 focus-visible:ring-offset-2 focus-visible:ring-offset-pv-bg ${
                        isActive
                          ? "text-pv-text"
                          : "text-pv-muted hover:text-pv-text"
                      }`}
                    >
                      {isActive ? (
                        <motion.span
                          layoutId="mobile-nav-active-highlight"
                          className="absolute inset-0 rounded-lg border border-pv-emerald/[0.28] bg-pv-emerald/[0.1]"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 34,
                          }}
                          initial={false}
                        />
                      ) : null}
                      <span className="relative z-10">{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </LayoutGroup>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
