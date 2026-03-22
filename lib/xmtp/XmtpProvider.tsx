"use client";

/**
 * Contexto del cliente XMTP (Paso 4).
 *
 * - Crea `Client` con `Client.create(signer, options)` cuando hay wallet conectada.
 * - Respeta `NEXT_PUBLIC_FEATURE_XMTP` (sin crear cliente si está desactivado).
 * - Cierra el cliente con `close()` al desconectar, cambiar cuenta o desmontar (doc XMTP).
 *
 * Debe montarse **dentro** de `WalletProvider`.
 *
 * @see https://docs.xmtp.org/chat-apps/core-messaging/create-a-client
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Client, type XmtpEnv } from "@xmtp/browser-sdk";
import { useWallet } from "@/lib/wallet";
import type { XmtpClientInstance } from "@/lib/xmtp/types";
import {
  getXmtpClientCreateOptions,
  isXmtpFeatureEnabled,
} from "@/lib/xmtp/config";
import {
  createXmtpSignerFromEthereum,
  type EthereumEip1193Provider,
} from "@/lib/xmtp/signer";

export type XmtpClientStatus =
  /** Sin wallet o aún no aplicable */
  | "idle"
  /** `NEXT_PUBLIC_FEATURE_XMTP` no está activo */
  | "disabled"
  /** Creando cliente (puede solicitar firma al registrar inbox) */
  | "initializing"
  | "ready"
  | "error";

export type XmtpContextValue = {
  /** Instancia lista para `conversations`, etc. Solo con `status === "ready"`. */
  client: XmtpClientInstance | null;
  status: XmtpClientStatus;
  error: Error | null;
  /** Dirección con la que se intentó / logró inicializar (null si idle/disabled). */
  activeAddress: string | null;
  /** Indica si la feature flag está encendida (build-time). */
  featureEnabled: boolean;
  /** Reintenta `Client.create` tras un fallo (misma cuenta). */
  retry: () => void;
};

const defaultValue: XmtpContextValue = {
  client: null,
  status: "idle",
  error: null,
  activeAddress: null,
  featureEnabled: false,
  retry: () => {},
};

const XmtpCtx = createContext<XmtpContextValue>(defaultValue);

function getInjectedEthereum(): EthereumEip1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: EthereumEip1193Provider })
    .ethereum;
  return eth ?? null;
}

export function XmtpProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useWallet();
  const featureEnabled = useMemo(() => isXmtpFeatureEnabled(), []);

  const [client, setClient] = useState<XmtpClientInstance | null>(null);
  const [status, setStatus] = useState<XmtpClientStatus>(
    featureEnabled ? "idle" : "disabled"
  );
  const [error, setError] = useState<Error | null>(null);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const clientRef = useRef<XmtpClientInstance | null>(null);
  const initGenRef = useRef(0);

  const retry = useCallback(() => {
    setRetryTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!featureEnabled) {
      setStatus("disabled");
      setClient(null);
      setActiveAddress(null);
      setError(null);
      if (clientRef.current) {
        try {
          clientRef.current.close();
        } catch {
          /* ignore */
        }
        clientRef.current = null;
      }
      return;
    }

    if (!isConnected || !address) {
      initGenRef.current += 1;
      if (clientRef.current) {
        try {
          clientRef.current.close();
        } catch {
          /* ignore */
        }
        clientRef.current = null;
      }
      setClient(null);
      setActiveAddress(null);
      setError(null);
      setStatus("idle");
      return;
    }

    const ethereum = getInjectedEthereum();
    if (!ethereum) {
      setClient(null);
      setActiveAddress(null);
      setError(new Error("XMTP: no injected Ethereum provider"));
      setStatus("error");
      return;
    }

    const myGen = ++initGenRef.current;
    setStatus("initializing");
    setError(null);
    setActiveAddress(address);

    (async () => {
      let newClient: XmtpClientInstance | null = null;
      try {
        const signer = createXmtpSignerFromEthereum(ethereum, address);
        const opts = getXmtpClientCreateOptions();
        // ClientOptions es intersección con unión (NetworkOptions | { backend });
        // TypeScript no estrecha el literal; el runtime usa la rama `env` (sin `backend`).
        newClient = await Client.create(signer, {
          env: opts.env as XmtpEnv,
          appVersion: opts.appVersion,
        } as Parameters<typeof Client.create>[1]);

        if (myGen !== initGenRef.current) {
          newClient.close();
          return;
        }

        if (clientRef.current && clientRef.current !== newClient) {
          try {
            clientRef.current.close();
          } catch {
            /* ignore */
          }
        }

        clientRef.current = newClient;
        setClient(newClient);
        setStatus("ready");
        setError(null);
      } catch (e) {
        if (myGen !== initGenRef.current) {
          newClient?.close();
          return;
        }
        newClient?.close();
        clientRef.current = null;
        setClient(null);
        const err =
          e instanceof Error ? e : new Error(String(e ?? "XMTP init failed"));
        setError(err);
        setStatus("error");
      }
    })();

    return () => {
      // Invalida cualquier `Client.create` en vuelo (Strict Mode / cambio de cuenta).
      initGenRef.current += 1;
      if (clientRef.current) {
        try {
          clientRef.current.close();
        } catch {
          /* ignore */
        }
        clientRef.current = null;
      }
      setClient(null);
    };
  }, [
    featureEnabled,
    isConnected,
    address,
    retryTrigger,
  ]);

  const value = useMemo<XmtpContextValue>(
    () => ({
      client,
      status,
      error,
      activeAddress,
      featureEnabled,
      retry,
    }),
    [client, status, error, activeAddress, featureEnabled, retry]
  );

  return <XmtpCtx.Provider value={value}>{children}</XmtpCtx.Provider>;
}

export function useXmtp(): XmtpContextValue {
  return useContext(XmtpCtx);
}
