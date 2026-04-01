"use client";

import { useTranslations } from "next-intl";
import { Button, Input } from "@/components/ui";

type VsXmtpChatPreviewShellProps = {
  peerShort: string;
  viewerShort: string;
};

/**
 * Maqueta visual del hilo XMTP para demo 1v1 cuando el rival aún no está en la red.
 * No envía mensajes ni usa el SDK.
 */
export default function VsXmtpChatPreviewShell({
  peerShort,
  viewerShort,
}: VsXmtpChatPreviewShellProps) {
  const t = useTranslations("xmtpVs");

  return (
    <>
      <div
        className="mb-3 max-h-[220px] overflow-y-auto rounded-lg border border-white/[0.08] bg-pv-bg/40 px-3 py-2 space-y-2"
        role="region"
        aria-label={t("chatPreviewAriaLabel")}
      >
        <p className="sr-only">
          {t("chatPreviewSrHint", { peer: peerShort, you: viewerShort })}
        </p>
        <div className="mr-auto max-w-[92%] rounded-md border border-white/[0.06] bg-pv-surface2 px-2.5 py-1.5 text-xs leading-relaxed text-pv-text/90">
          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-pv-muted">
            {peerShort}
          </span>
          {t("chatPreviewBubblePeer")}
        </div>
        <div className="ml-auto max-w-[92%] rounded-md border border-pv-emerald/20 bg-pv-emerald/[0.12] px-2.5 py-1.5 text-xs leading-relaxed text-pv-text">
          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-pv-emerald/80">
            {viewerShort}
          </span>
          {t("chatPreviewBubbleYou")}
        </div>
        <div className="mr-auto max-w-[92%] rounded-md border border-white/[0.06] bg-pv-surface2 px-2.5 py-1.5 text-xs leading-relaxed text-pv-text/90">
          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-pv-muted">
            {peerShort}
          </span>
          {t("chatPreviewBubblePeerShort")}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end opacity-75">
        <Input
          disabled
          readOnly
          value=""
          placeholder={t("chatPreviewInputPlaceholder")}
          className="flex-1 min-h-[44px]"
          aria-disabled="true"
        />
        <Button
          type="button"
          variant="primary"
          fullWidth={false}
          className="sm:mb-0 min-h-[44px] px-5"
          disabled
        >
          {t("send")}
        </Button>
      </div>

      <p className="text-[10px] text-pv-muted/70 mt-3 leading-relaxed">
        {t("chatPreviewFootnote")}
      </p>
    </>
  );
}
