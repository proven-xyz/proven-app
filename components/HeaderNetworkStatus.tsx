"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import {
  ensureGenlayerWalletChain,
  getConfiguredNetworkAlias,
  getConfiguredNetworkName,
  getSwitchableNetworkOptions,
  setClientPreferredNetworkAlias,
  type SupportedGenlayerNetwork,
} from "@/lib/genlayer";

type NetworkProbeStatus = "checking" | "connected" | "stalled";

type NetworkStatusResponse = {
  networkName?: string;
  status?: "connected" | "stalled";
  checkedAt?: string;
  latencyMs?: number | null;
  error?: string | null;
};

const POLL_INTERVAL_MS = 5_000;

function shortenNetworkName(networkName: string) {
  return networkName
    .replace(/^GenLayer\s+/i, "")
    .replace(/\s+Chain$/i, "")
    .trim();
}

function getNetworkEnvironmentLabel(
  alias: SupportedGenlayerNetwork,
  t: ReturnType<typeof useTranslations>
) {
  if (alias === "studionet") {
    return t("networkEnvironmentStudio");
  }
  if (alias === "testnet-bradbury") {
    return t("networkEnvironmentBradbury");
  }
  if (alias === "testnet-asimov") {
    return t("networkEnvironmentAsimov");
  }
  return t("networkEnvironmentLocal");
}

export default function HeaderNetworkStatus({
  enabled,
  compact = false,
}: {
  enabled: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("header");
  const requestRef = useRef(0);
  const busyRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<SupportedGenlayerNetwork>(() =>
    getConfiguredNetworkAlias()
  );
  const [switchingAlias, setSwitchingAlias] = useState<SupportedGenlayerNetwork | null>(
    null
  );
  const [status, setStatus] = useState<NetworkProbeStatus>("checking");
  const [networkName, setNetworkName] = useState(
    shortenNetworkName(getConfiguredNetworkName(selectedNetwork))
  );
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const networkOptions = useMemo(() => getSwitchableNetworkOptions(), []);

  const activeOption = useMemo(() => {
    return (
      networkOptions.find((option) => option.alias === selectedNetwork) ?? {
        alias: selectedNetwork,
        name: getConfiguredNetworkName(selectedNetwork),
        shortName: shortenNetworkName(getConfiguredNetworkName(selectedNetwork)),
        hasContract: true,
      }
    );
  }, [networkOptions, selectedNetwork]);

  const availableOptions = useMemo(
    () => networkOptions.filter((option) => option.alias !== selectedNetwork),
    [networkOptions, selectedNetwork]
  );

  const runProbe = async (
    showBusy = false,
    targetNetwork: SupportedGenlayerNetwork = selectedNetwork
  ) => {
    if (!enabled || busyRef.current) {
      return;
    }

    busyRef.current = true;
    const requestId = ++requestRef.current;
    if (showBusy) {
      setStatus("checking");
    }

    try {
      const response = await fetch(
        `/api/network-status?network=${encodeURIComponent(targetNetwork)}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`http_${response.status}`);
      }

      const payload = (await response.json()) as NetworkStatusResponse;
      if (requestId !== requestRef.current) {
        return;
      }

      const nextNetworkName =
        typeof payload.networkName === "string" && payload.networkName.trim()
          ? shortenNetworkName(payload.networkName)
          : shortenNetworkName(getConfiguredNetworkName(targetNetwork));
      setNetworkName(nextNetworkName);
      setCheckedAt(payload.checkedAt ?? null);
      setLatencyMs(typeof payload.latencyMs === "number" ? payload.latencyMs : null);
      setStatus(payload.status === "connected" ? "connected" : "stalled");
    } catch {
      if (requestId !== requestRef.current) {
        return;
      }
      setNetworkName(shortenNetworkName(getConfiguredNetworkName(targetNetwork)));
      setStatus("stalled");
      setLatencyMs(null);
    } finally {
      if (requestId === requestRef.current) {
        busyRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (!enabled) {
      requestRef.current += 1;
      busyRef.current = false;
      setStatus("checking");
      setCheckedAt(null);
      setLatencyMs(null);
      return;
    }

    setNetworkName(activeOption.shortName);
    void runProbe(true, selectedNetwork);
    const intervalId = window.setInterval(() => {
      void runProbe(false, selectedNetwork);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      requestRef.current += 1;
      busyRef.current = false;
    };
  }, [activeOption.shortName, enabled, selectedNetwork]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const isStalled = status === "stalled";
  const isChecking = status === "checking";
  const statusLabel = isStalled
    ? t("networkStalled")
    : isChecking
      ? t("networkChecking")
      : t("networkLive");
  const activeEnvironmentLabel = getNetworkEnvironmentLabel(selectedNetwork, t);
  const availableNetworksHeading =
    availableOptions.length === 1 ? t("availableNetwork") : t("availableNetworks");

  const title = useMemo(() => {
    const parts = [`${networkName}: ${statusLabel}`];
    if (latencyMs != null) {
      parts.push(`${latencyMs}ms`);
    }
    if (checkedAt) {
      parts.push(checkedAt);
    }
    return parts.join(" | ");
  }, [checkedAt, latencyMs, networkName, statusLabel]);

  if (!enabled) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        title={title}
        className={[
          "chip focus-ring inline-flex items-center gap-2 font-mono font-bold uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
          compact ? "px-3 py-1.5 text-[10px] tracking-[0.14em]" : "px-3.5 py-1.5 text-[11px] tracking-[0.14em]",
          isStalled
            ? "border-pv-danger/35 bg-pv-danger/[0.08] text-pv-danger hover:border-pv-danger/50 hover:bg-pv-danger/[0.12]"
            : isChecking
              ? "border-pv-gold/35 bg-pv-gold/[0.08] text-pv-gold hover:border-pv-gold/45 hover:bg-pv-gold/[0.12]"
              : "border-pv-emerald/[0.26] bg-pv-emerald/[0.07] text-pv-emerald hover:border-pv-emerald/[0.38] hover:bg-pv-emerald/[0.1]",
        ].join(" ")}
        aria-label={title}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <span
          className={[
            "h-2 w-2 rounded-full",
            isStalled
              ? "bg-pv-danger"
              : isChecking
                ? "animate-pulse bg-pv-gold"
                : "bg-pv-emerald",
          ].join(" ")}
          aria-hidden
        />
        <span>{networkName}</span>
        {!compact ? (
          <span className="normal-case tracking-normal text-current/75">
            {statusLabel}
          </span>
        ) : null}
        <ChevronDown
          size={12}
          className={`transition-transform ${menuOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+10px)] z-[70] w-[320px] overflow-hidden rounded-2xl border border-white/[0.12] bg-pv-surface/95 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          >
            <div className="border-b border-white/[0.08] bg-[linear-gradient(135deg,rgba(93,230,255,0.08),rgba(248,172,255,0.04),rgba(14,14,14,0.94))] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted/80">
                    {t("currentNetwork")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-pv-text">
                    {activeOption.shortName}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-pv-muted">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          isStalled
                            ? "bg-pv-danger"
                            : isChecking
                              ? "animate-pulse bg-pv-gold"
                              : "bg-pv-emerald",
                        ].join(" ")}
                        aria-hidden
                      />
                      <span
                        className={
                          isStalled
                            ? "text-pv-danger"
                            : isChecking
                              ? "text-pv-gold"
                              : "text-pv-emerald"
                        }
                      >
                        {statusLabel}
                      </span>
                    </span>
                    {latencyMs != null ? (
                      <span className="text-pv-muted/75">{latencyMs} ms</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[11px] text-pv-muted/80">
                    {activeEnvironmentLabel}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void runProbe(true, selectedNetwork);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-pv-muted transition-colors hover:border-white/[0.2] hover:text-pv-text"
                  aria-label={t("refreshNetworkStatus")}
                  title={t("refreshNetworkStatus")}
                >
                  <RefreshCw
                    size={14}
                    className={isChecking ? "animate-spin" : ""}
                    aria-hidden
                  />
                </button>
              </div>
            </div>

            {availableOptions.length > 0 ? (
              <>
                <div className="px-4 pt-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-pv-muted/80">
                    {availableNetworksHeading}
                  </p>
                </div>

                <div className="space-y-1 p-2 pt-2">
                  {availableOptions.map((option) => {
                    const isBusy = switchingAlias === option.alias;
                    const isUnavailable = !option.hasContract;
                    const environmentLabel = getNetworkEnvironmentLabel(option.alias, t);

                    return (
                      <button
                        key={option.alias}
                        type="button"
                        role="menuitem"
                        disabled={isUnavailable || isBusy}
                        onClick={() => {
                          if (isUnavailable || isBusy) {
                            return;
                          }

                          setSwitchingAlias(option.alias);
                          setSelectedNetwork(option.alias);
                          setClientPreferredNetworkAlias(option.alias);

                          const ethereum =
                            typeof window !== "undefined"
                              ? (window as any).ethereum
                              : undefined;

                          const completeSwitch = async () => {
                            try {
                              if (ethereum) {
                                await ensureGenlayerWalletChain(ethereum, option.alias);
                              }
                            } catch {
                              // Keep the selected runtime network even if the wallet rejects the switch.
                            } finally {
                              window.location.reload();
                            }
                          };

                          void completeSwitch();
                        }}
                        className={[
                          "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
                          isUnavailable
                            ? "border-white/[0.06] bg-white/[0.02] text-pv-muted/55"
                            : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.18] hover:bg-white/[0.06]",
                        ].join(" ")}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-snug text-pv-text">
                            {option.shortName}
                          </p>
                          <p className="mt-1 text-[11px] text-pv-muted">
                            {environmentLabel}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isUnavailable ? (
                            <span
                              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-pv-muted/60"
                            >
                              {t("networkUnavailable")}
                            </span>
                          ) : null}
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-black/20 text-pv-text/80">
                            {isBusy ? (
                              <RefreshCw size={14} className="animate-spin" aria-hidden />
                            ) : (
                              <ChevronDown size={13} className="-rotate-90" aria-hidden />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
