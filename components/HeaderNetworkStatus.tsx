"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

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
    .replace(/\s+Testnet(?:\s+Chain)?$/i, "")
    .trim();
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
  const [status, setStatus] = useState<NetworkProbeStatus>("checking");
  const [networkName, setNetworkName] = useState("Bradbury");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const runProbe = async (showBusy = false) => {
    if (!enabled || busyRef.current) {
      return;
    }

    busyRef.current = true;
    const requestId = ++requestRef.current;
    if (showBusy) {
      setStatus("checking");
    }

    try {
      const response = await fetch("/api/network-status", {
        cache: "no-store",
      });

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
          : "Bradbury";
      setNetworkName(nextNetworkName);
      setCheckedAt(payload.checkedAt ?? null);
      setLatencyMs(typeof payload.latencyMs === "number" ? payload.latencyMs : null);
      setStatus(payload.status === "connected" ? "connected" : "stalled");
    } catch {
      if (requestId !== requestRef.current) {
        return;
      }
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

    void runProbe(true);
    const intervalId = window.setInterval(() => {
      void runProbe();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      requestRef.current += 1;
      busyRef.current = false;
    };
  }, [enabled]);

  const isStalled = status === "stalled";
  const isChecking = status === "checking";

  const title = useMemo(() => {
    const stateLabel = isStalled
      ? t("networkStalled")
      : isChecking
        ? t("networkChecking")
        : t("networkLive");

    const parts = [`${networkName}: ${stateLabel}`];
    if (latencyMs != null) {
      parts.push(`${latencyMs}ms`);
    }
    if (checkedAt) {
      parts.push(checkedAt);
    }
    return parts.join(" | ");
  }, [checkedAt, isChecking, isStalled, latencyMs, networkName, t]);

  if (!enabled) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        void runProbe(true);
      }}
      title={title}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-[border-color,color,background-color,transform]",
        isStalled
          ? "border-pv-danger/30 bg-pv-danger/[0.08] text-pv-danger hover:border-pv-danger/50 hover:bg-pv-danger/[0.12]"
          : isChecking
            ? "border-pv-gold/30 bg-pv-gold/[0.08] text-pv-gold hover:border-pv-gold/45 hover:bg-pv-gold/[0.12]"
            : "border-pv-emerald/[0.22] bg-pv-emerald/[0.07] text-pv-emerald hover:border-pv-emerald/[0.35] hover:bg-pv-emerald/[0.1]",
      ].join(" ")}
      aria-label={title}
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
          {isStalled
            ? t("networkStalled")
            : isChecking
              ? t("networkChecking")
              : t("networkLive")}
        </span>
      ) : null}
      {(isStalled || isChecking) && (
        <RefreshCw
          size={11}
          className={isChecking ? "animate-spin" : ""}
          aria-hidden
        />
      )}
    </button>
  );
}
