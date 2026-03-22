/**
 * Utilidades de hilo DM (cliente XMTP) — Paso 6: sync global, consentimiento, mensajes.
 * Solo importar desde `"use client"` o hooks.
 */

import {
  Client,
  ConsentState,
  IdentifierKind,
  type DecodedMessage,
  type Dm,
  type Identifier,
  type XmtpEnv,
} from "@xmtp/browser-sdk";
import { getXmtpEnv } from "@/lib/xmtp/config";
import type { XmtpClientInstance } from "@/lib/xmtp/types";

/** Límite de historial por carga / refresco (BigInt por API del SDK). */
export const XMTP_THREAD_MESSAGE_LIMIT = BigInt(40);

export class XmtpPeerUnreachableError extends Error {
  readonly code = "XMTP_PEER_UNREACHABLE" as const;

  constructor() {
    super("XMTP_PEER_UNREACHABLE");
    this.name = "XmtpPeerUnreachableError";
  }
}

export type XmtpThreadErrorKind =
  | "peer_unreachable"
  | "rate_limit"
  | "network"
  | "unknown";

export function peerIdentifierFromAddress(address: string): Identifier {
  return {
    identifier: address.toLowerCase(),
    identifierKind: IdentifierKind.Ethereum,
  };
}

export function sortDecodedMessagesBySentAt(
  list: DecodedMessage[]
): DecodedMessage[] {
  return [...list].sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
}

/** Texto legible de un mensaje decodificado (prioriza contenido de texto). */
export function getDecodedMessageText(m: DecodedMessage): string {
  const c = m.content;
  if (typeof c === "string") return c;
  if (c != null && typeof c === "object" && "text" in c) {
    const t = (c as { text?: unknown }).text;
    if (typeof t === "string") return t;
  }
  return m.fallback?.trim() || "…";
}

export function classifyXmtpThreadError(err: unknown): {
  kind: XmtpThreadErrorKind;
  message: string;
} {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (
    err instanceof XmtpPeerUnreachableError ||
    message === "XMTP_PEER_UNREACHABLE"
  ) {
    return { kind: "peer_unreachable", message };
  }
  if (
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  ) {
    return { kind: "rate_limit", message };
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("econnreset")
  ) {
    return { kind: "network", message };
  }
  return { kind: "unknown", message };
}

/**
 * Sincroniza conversaciones permitidas, abre o crea el DM 1v1, ajusta consent
 * si sigue en `Unknown`, sincroniza el hilo y devuelve mensajes ordenados.
 */
export async function ensureVsDmThread(
  client: XmtpClientInstance,
  peerAddress: string
): Promise<{ dm: Dm; messages: DecodedMessage[] }> {
  const id = peerIdentifierFromAddress(peerAddress);

  await client.conversations.syncAll([ConsentState.Allowed]);

  let conversation = await client.conversations.fetchDmByIdentifier(id);

  if (!conversation) {
    const env = client.env ?? (getXmtpEnv() as XmtpEnv);
    const canMap = await Client.canMessage([id], env);
    const can =
      canMap.get(id.identifier) ??
      Array.from(canMap.values()).some(Boolean);
    if (!can) {
      throw new XmtpPeerUnreachableError();
    }
    conversation = await client.conversations.createDmWithIdentifier(id);
  }

  const consent = await conversation.consentState();
  if (consent === ConsentState.Unknown) {
    await conversation.updateConsentState(ConsentState.Allowed);
  }

  await conversation.sync();

  const raw = await conversation.messages({
    limit: XMTP_THREAD_MESSAGE_LIMIT,
  });
  const messages = sortDecodedMessagesBySentAt(raw);

  return { dm: conversation, messages };
}

/** Recarga mensajes tras `sync` (mismo orden y límite que la apertura). */
export async function loadThreadMessages(dm: Dm): Promise<DecodedMessage[]> {
  const raw = await dm.messages({ limit: XMTP_THREAD_MESSAGE_LIMIT });
  return sortDecodedMessagesBySentAt(raw);
}
