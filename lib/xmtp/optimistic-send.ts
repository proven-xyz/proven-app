/**
 * Fusión de mensajes decodificados del SDK con envíos optimistas (Paso 7).
 * Solo cliente.
 */

import type { DecodedMessage } from "@xmtp/browser-sdk";

/** Mensaje local hasta que el hilo remoto confirma el `serverMessageId`. */
export type OptimisticPendingMessage = {
  clientTempId: string;
  text: string;
  sentAt: Date;
  /** ID devuelto por `sendText` tras enviar (dedupe con `DecodedMessage.id`). */
  serverMessageId?: string;
  status: "sending" | "sent";
};

export type ThreadDisplayRow =
  | { kind: "decoded"; message: DecodedMessage }
  | { kind: "pending"; pending: OptimisticPendingMessage };

/**
 * Combina mensajes remotos con pendientes optimistas, ordenados por `sentAt`.
 * Oculta un pendiente si ya existe un `DecodedMessage` con el mismo `id` que `serverMessageId`.
 */
export function mergeThreadDisplayRows(
  decoded: DecodedMessage[],
  pending: OptimisticPendingMessage[]
): ThreadDisplayRow[] {
  const pendingVisible = pending.filter((p) => {
    if (!p.serverMessageId) return true;
    return !decoded.some((m) => m.id === p.serverMessageId);
  });

  const decodedRows: ThreadDisplayRow[] = decoded.map((m) => ({
    kind: "decoded",
    message: m,
  }));

  const pendingRows: ThreadDisplayRow[] = pendingVisible.map((p) => ({
    kind: "pending",
    pending: p,
  }));

  const merged = [...decodedRows, ...pendingRows];
  merged.sort((a, b) => {
    const ta =
      a.kind === "decoded"
        ? a.message.sentAt.getTime()
        : a.pending.sentAt.getTime();
    const tb =
      b.kind === "decoded"
        ? b.message.sentAt.getTime()
        : b.pending.sentAt.getTime();
    return ta - tb;
  });
  return merged;
}
