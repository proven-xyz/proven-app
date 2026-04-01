"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { VSData } from "@/lib/contract";
import { useWallet } from "@/lib/wallet";
import { useXmtp } from "@/lib/xmtp/XmtpProvider";
import {
  canOpenVsXmtpChat,
  getVsXmtpPeerAddress,
  getVsXmtpUnavailableReason,
  isOneVsOneDemoVs,
  shouldShowXmtpPeerUnreachableChatPreview,
} from "@/lib/xmtp/vs-chat-eligibility";
import { shortenAddress } from "@/lib/constants";
import { Button, Input } from "@/components/ui";
import VsXmtpChatPreviewShell from "@/components/xmtp/VsXmtpChatPreviewShell";
import {
  isXmtpInstallationsLimitError,
  XMTP_INBOX_TOOLS_URL,
} from "@/lib/xmtp/installation-limit-error";
import { ExternalLink, MessageCircle, RefreshCw } from "lucide-react";
import { useVsXmtpThread } from "@/hooks/useVsXmtpThread";
import { getDecodedMessageText } from "@/lib/xmtp/chat-thread";
import {
  mergeThreadDisplayRows,
  type OptimisticPendingMessage,
} from "@/lib/xmtp/optimistic-send";

const XMTP_PANEL_TITLE_FALLBACK: Record<string, string> = {
  en: "XMTP MESSAGES",
  es: "MENSAJES XMTP",
};

export default function VsXmtpPanel({ vs }: { vs: VSData }) {
  const locale = useLocale();
  const t = useTranslations("xmtpVs");
  const panelTitle = useMemo(() => {
    const v = t("title");
    if (typeof v === "string" && v.startsWith("xmtpVs.")) {
      return XMTP_PANEL_TITLE_FALLBACK[locale] ?? XMTP_PANEL_TITLE_FALLBACK.en;
    }
    return v;
  }, [t, locale]);
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

  const showPeerUnreachablePreview =
    Boolean(threadError) &&
    shouldShowXmtpPeerUnreachableChatPreview(vs, threadError?.kind);

  const xmtpProviderErrorMessage = xmtpError?.message ?? "";
  const showInboxToolsForInstallLimit = useMemo(
    () => isXmtpInstallationsLimitError(xmtpProviderErrorMessage),
    [xmtpProviderErrorMessage]
  );

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

  const unavailableCopy = useMemo(() => {
    if (canOpenVsXmtpChat(vs)) return null;
    const reason = getVsXmtpUnavailableReason(vs);
    if (reason === "multi_challenger") return t("unavailableMultiChallenger");
    if (reason === "waiting_opponent") return t("unavailableWaitingOpponent");
    if (reason === "not_accepted") return t("unavailableNotAccepted");
    return t("needsAccepted");
  }, [vs, t]);

  if (!featureEnabled) {
    if (isOneVsOneDemoVs(vs)) {
      return (
        <div className="card border border-white/[0.08] p-5 lg:max-w-[800px] lg:mx-auto mb-6 sm:mb-8">
          <div className="flex min-w-0 gap-3 sm:gap-3.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-muted/15 text-pv-muted"
              aria-hidden
            >
              <MessageCircle size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0 space-y-1">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-text sm:tracking-[0.2em]">
                {t("featureOffTitle")}
              </h3>
              <p className="text-[10px] leading-relaxed text-pv-muted sm:text-[11px]">
                {t("featureOffDesc")}
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  if (!canOpenVsXmtpChat(vs)) {
    return (
      <div className="card border border-white/[0.08] p-5 lg:max-w-[800px] lg:mx-auto mb-6 sm:mb-8">
        <div className="flex min-w-0 gap-3 sm:gap-3.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
            aria-hidden
          >
            <MessageCircle size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-text sm:tracking-[0.2em]">
              {panelTitle}
            </h3>
            <p className="text-[10px] leading-relaxed text-pv-muted sm:text-[11px]">
              {unavailableCopy}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="card border border-white/[0.08] p-5 lg:max-w-[800px] lg:mx-auto mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3 sm:gap-3.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
              aria-hidden
            >
              <MessageCircle size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0 space-y-1">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-text sm:tracking-[0.2em]">
                {panelTitle}
              </h3>
              <p className="text-[10px] leading-relaxed text-pv-muted sm:text-[11px]">
                {t("needsWallet")}
              </p>
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
      <div className="card border border-white/[0.08] p-5 lg:max-w-[800px] lg:mx-auto mb-6 sm:mb-8">
        <div className="flex min-w-0 gap-3 sm:gap-3.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
            aria-hidden
          >
            <MessageCircle size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-text sm:tracking-[0.2em]">
              {panelTitle}
            </h3>
            <p className="text-[10px] leading-relaxed text-pv-muted sm:text-[11px]">
              {t("participantOnly")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card border border-pv-emerald/[0.18] p-5 lg:max-w-[800px] lg:mx-auto mb-6 sm:mb-8">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex min-w-0 flex-1 gap-3 sm:gap-3.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pv-emerald/10 text-pv-emerald"
            aria-hidden
          >
            <MessageCircle size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-pv-text sm:tracking-[0.2em]">
              {panelTitle}
            </h3>
            <p className="text-[10px] leading-relaxed text-pv-muted sm:text-[11px]">
              {t("withPeer", { address: shortenAddress(peerAddress) })}
            </p>
          </div>
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
        <div
          role="alert"
          className="mb-3 overflow-hidden rounded-xl border border-pv-danger/30 bg-pv-danger/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
        >
          <div className="border-b border-white/[0.06] bg-pv-bg/25 px-3.5 py-2.5 sm:px-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pv-danger/90">
              {t("providerErrorEyebrow")}
            </p>
          </div>
          <div className="px-3.5 py-3 sm:px-4 sm:py-3.5">
            <p className="text-xs leading-relaxed text-pv-text/90 [overflow-wrap:anywhere]">
              {xmtpProviderErrorMessage || t("errorGeneric")}
            </p>
            {showInboxToolsForInstallLimit ? (
              <div className="mt-4 rounded-lg border border-white/[0.1] bg-pv-bg/40 px-3 py-2.5 sm:px-3.5 sm:py-3">
                <div className="flex flex-row items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-pv-muted">
                    {t("installationsLimitGuide")}
                  </p>
                  <a
                    href={XMTP_INBOX_TOOLS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/[0.12] bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-pv-muted transition-[border-color,background-color,color] hover:border-white/[0.18] hover:bg-white/[0.06] hover:text-pv-text/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 whitespace-nowrap"
                  >
                    <ExternalLink size={12} className="shrink-0 opacity-70" aria-hidden />
                    {t("openInboxTools")}
                  </a>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                retry();
                clearThreadError();
              }}
              className="mt-3 text-left text-xs font-semibold text-pv-emerald hover:underline"
            >
              {t("retry")}
            </button>
          </div>
        </div>
      )}

      {!isXmtpProviderError && innerLoading && (
        <p className="text-xs text-pv-muted animate-pulse">{t("loadingConversation")}</p>
      )}

      {!isXmtpProviderError &&
        innerThreadError &&
        threadErrorLabel &&
        showPeerUnreachablePreview && (
          <div className="mb-3 space-y-3">
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2.5 sm:px-3.5 sm:py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/85">
                {t("chatPreviewEyebrow")}
              </p>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-pv-muted">
                  {t("chatPreviewBanner")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    retryOpenThread();
                    setSendError(null);
                    setPendingSends([]);
                  }}
                  className="shrink-0 text-left text-xs font-semibold text-pv-emerald hover:underline sm:text-right"
                >
                  {t("retry")}
                </button>
              </div>
            </div>
            <VsXmtpChatPreviewShell
              peerShort={shortenAddress(peerAddress)}
              viewerShort={shortenAddress(address)}
            />
          </div>
        )}

      {!isXmtpProviderError &&
        innerThreadError &&
        threadErrorLabel &&
        !showPeerUnreachablePreview && (
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
