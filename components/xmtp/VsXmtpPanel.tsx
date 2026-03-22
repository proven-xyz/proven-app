"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { VSData } from "@/lib/contract";
import { useWallet } from "@/lib/wallet";
import { useXmtp } from "@/lib/xmtp/XmtpProvider";
import {
  canOpenVsXmtpChat,
  getVsXmtpPeerAddress,
} from "@/lib/xmtp/vs-chat-eligibility";
import { shortenAddress } from "@/lib/constants";
import { Button, Input } from "@/components/ui";
import { MessageCircle, RefreshCw } from "lucide-react";
import { useVsXmtpThread } from "@/hooks/useVsXmtpThread";
import { getDecodedMessageText } from "@/lib/xmtp/chat-thread";
import {
  mergeThreadDisplayRows,
  type OptimisticPendingMessage,
} from "@/lib/xmtp/optimistic-send";

export default function VsXmtpPanel({ vs }: { vs: VSData }) {
  const t = useTranslations("xmtpVs");
  const { address, isConnected, connect } = useWallet();
  const {
    client,
    status: xmtpStatus,
    error: xmtpError,
    featureEnabled,
    retry,
  } = useXmtp();

  const [sendError, setSendError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingSends, setPendingSends] = useState<OptimisticPendingMessage[]>(
    []
  );

  const peerAddress = useMemo(
    () => getVsXmtpPeerAddress(vs, address),
    [vs, address]
  );

  useEffect(() => {
    setPendingSends([]);
    setSendError(null);
    setDraft("");
  }, [peerAddress]);

  const showChrome = featureEnabled && canOpenVsXmtpChat(vs);

  const threadEligible =
    showChrome &&
    isConnected &&
    Boolean(address) &&
    Boolean(peerAddress) &&
    xmtpStatus === "ready" &&
    Boolean(client);

  const {
    phase: threadPhase,
    dm,
    messages,
    threadError,
    isRefreshing,
    refreshThread,
    retryOpenThread,
    clearThreadError,
  } = useVsXmtpThread({
    threadEligible,
    client: client ?? null,
    peerAddress: peerAddress ?? "",
  });

  const isXmtpBoot = xmtpStatus === "initializing";
  const isXmtpProviderError =
    xmtpStatus === "error" || (xmtpStatus === "ready" && !client);

  const innerLoading =
    threadEligible &&
    (threadPhase === "loading" || threadPhase === "idle");

  const innerReady = threadEligible && threadPhase === "ready" && dm;
  const innerThreadError =
    threadEligible && threadPhase === "error" && threadError;

  const threadErrorLabel = useMemo(() => {
    if (!threadError) return null;
    switch (threadError.kind) {
      case "peer_unreachable":
        return t("peerUnreachable");
      case "rate_limit":
        return t("rateLimited");
      case "network":
        return t("networkError");
      default:
        return threadError.technical || t("errorGeneric");
    }
  }, [threadError, t]);

  /** Cuando el stream incorpora el mensaje real, quita la burbuja optimista. */
  useEffect(() => {
    setPendingSends((prev) =>
      prev.filter((p) => {
        if (!p.serverMessageId) return true;
        return !messages.some((m) => m.id === p.serverMessageId);
      })
    );
  }, [messages]);

  const displayRows = useMemo(
    () => mergeThreadDisplayRows(messages, pendingSends),
    [messages, pendingSends]
  );

  const handleSend = useCallback(async () => {
    if (!dm) return;
    const text = draft.trim();
    if (!text) return;
    clearThreadError();
    setSendError(null);
    const clientTempId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sentAt = new Date();
    setDraft("");
    setPendingSends((prev) => [
      ...prev,
      { clientTempId, text, sentAt, status: "sending" },
    ]);
    try {
      const serverMessageId = await dm.sendText(text, true);
      setPendingSends((prev) =>
        prev.map((p) =>
          p.clientTempId === clientTempId
            ? { ...p, serverMessageId, status: "sent" as const }
            : p
        )
      );
    } catch (e) {
      setPendingSends((prev) =>
        prev.filter((p) => p.clientTempId !== clientTempId)
      );
      setSendError(e instanceof Error ? e.message : String(e));
    }
  }, [dm, draft, clearThreadError]);

  if (!featureEnabled) {
    return null;
  }

  if (!canOpenVsXmtpChat(vs)) {
    return (
      <div className="card border border-white/[0.08] p-5 lg:max-w-[800px] lg:mx-auto mb-5">
        <div className="flex items-center gap-2 text-pv-muted text-sm">
          <MessageCircle size={18} className="shrink-0 text-pv-emerald/70" />
          <span>{t("needsAccepted")}</span>
        </div>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="card border border-white/[0.08] p-5 lg:max-w-[800px] lg:mx-auto mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="shrink-0 text-pv-emerald" />
            <div>
              <div className="font-display text-sm font-bold text-pv-text">
                {t("title")}
              </div>
              <p className="text-xs text-pv-muted mt-0.5">{t("needsWallet")}</p>
            </div>
          </div>
          <Button type="button" variant="primary" fullWidth={false} onClick={connect}>
            {t("connectToChat")}
          </Button>
        </div>
      </div>
    );
  }

  if (!peerAddress) {
    return (
      <div className="card border border-white/[0.08] p-5 lg:max-w-[800px] lg:mx-auto mb-5 text-sm text-pv-muted">
        {t("participantOnly")}
      </div>
    );
  }

  return (
    <div className="card border border-pv-emerald/[0.18] p-5 lg:max-w-[800px] lg:mx-auto mb-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="font-display text-sm font-bold text-pv-text flex items-center gap-2">
            <MessageCircle size={18} className="text-pv-emerald" />
            {t("title")}
          </div>
          <p className="text-[11px] text-pv-muted mt-1">
            {t("withPeer", { address: shortenAddress(peerAddress) })}
          </p>
        </div>
        {innerReady && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            fullWidth={false}
            disabled={isRefreshing}
            onClick={() => void refreshThread()}
            className="shrink-0 text-pv-muted hover:text-pv-text"
            aria-busy={isRefreshing}
          >
            <RefreshCw
              size={16}
              className={isRefreshing ? "animate-spin" : undefined}
              aria-hidden
            />
            {isRefreshing ? t("syncingMessages") : t("refreshThread")}
          </Button>
        )}
      </div>

      {isXmtpBoot && (
        <p className="text-xs text-pv-muted animate-pulse">{t("initializingXmtp")}</p>
      )}

      {isXmtpProviderError && (
        <div className="rounded-lg border border-pv-danger/25 bg-pv-danger/[0.06] px-3 py-2 text-xs text-pv-danger mb-3">
          <p>{xmtpError?.message ?? t("errorGeneric")}</p>
          <button
            type="button"
            onClick={() => {
              retry();
              clearThreadError();
            }}
            className="mt-2 text-pv-emerald font-semibold hover:underline"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {!isXmtpProviderError && innerLoading && (
        <p className="text-xs text-pv-muted animate-pulse">{t("loadingConversation")}</p>
      )}

      {!isXmtpProviderError && innerThreadError && threadErrorLabel && (
        <div className="rounded-lg border border-pv-danger/25 bg-pv-danger/[0.06] px-3 py-2 text-xs text-pv-danger mb-3">
          <p>{threadErrorLabel}</p>
          <button
            type="button"
            onClick={() => {
              retryOpenThread();
              setSendError(null);
              setPendingSends([]);
            }}
            className="mt-2 text-pv-emerald font-semibold hover:underline"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {!isXmtpProviderError && innerReady && dm && client && (
        <>
          <div
            className="mb-3 max-h-[220px] overflow-y-auto rounded-lg border border-white/[0.08] bg-pv-bg/40 px-3 py-2 space-y-2"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {displayRows.length === 0 ? (
              <p className="text-xs text-pv-muted py-4 text-center">{t("emptyThread")}</p>
            ) : (
              displayRows.map((row) => {
                if (row.kind === "decoded") {
                  const m = row.message;
                  const mine =
                    Boolean(client.inboxId) && m.senderInboxId === client.inboxId;
                  return (
                    <div
                      key={m.id}
                      className={`text-xs leading-relaxed rounded-md px-2.5 py-1.5 max-w-[92%] ${
                        mine
                          ? "ml-auto bg-pv-emerald/[0.12] text-pv-text border border-pv-emerald/20"
                          : "mr-auto bg-pv-surface2 text-pv-text/90 border border-white/[0.06]"
                      }`}
                    >
                      {getDecodedMessageText(m)}
                    </div>
                  );
                }
                const { pending } = row;
                return (
                  <div
                    key={pending.clientTempId}
                    className="ml-auto max-w-[92%] text-xs leading-relaxed rounded-md px-2.5 py-1.5 bg-pv-emerald/[0.08] text-pv-text border border-pv-emerald/15 opacity-90"
                    aria-live="polite"
                  >
                    <span className="whitespace-pre-wrap break-words">
                      {pending.text}
                    </span>
                    <span className="block text-[10px] text-pv-muted mt-1">
                      {pending.status === "sending"
                        ? t("sendingMessage")
                        : t("messageQueued")}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {sendError && (
            <p className="text-[11px] text-pv-danger mb-2" role="alert">
              {sendError}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("placeholderInput")}
              className="flex-1 min-h-[44px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            <Button
              type="button"
              variant="primary"
              fullWidth={false}
              className="sm:mb-0 min-h-[44px] px-5"
              disabled={!draft.trim()}
              onClick={() => void handleSend()}
            >
              {t("send")}
            </Button>
          </div>

          <p className="text-[10px] text-pv-muted/60 mt-3">{t("disclaimer")}</p>
        </>
      )}
    </div>
  );
}
