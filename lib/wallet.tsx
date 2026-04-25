"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { getAddress } from "viem";
import {
  identifyWallet,
  resetAnalyticsIdentity,
  trackWalletConnected,
} from "@/lib/analytics";
import { ensureGenlayerWalletChain, getWalletChainParams } from "./genlayer";

interface WalletCtx {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  error: string | null;
}

const Ctx = createContext<WalletCtx>({
  address: null, isConnected: false, isConnecting: false, isCorrectNetwork: true,
  connect: async () => {}, disconnect: () => {}, switchNetwork: async () => {}, error: null,
});

function normalizeWalletAddress(address: string | null | undefined) {
  if (!address) {
    return null;
  }

  try {
    return getAddress(address);
  } catch {
    return address;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const lastTrackedAddressRef = useRef<string | null>(null);
  const expectedChainId = getWalletChainParams().chainId.toLowerCase();

  const isCorrectNetwork =
    chainId === null || chainId.toLowerCase() === expectedChainId;

  const switchNetwork = useCallback(async () => {
    const ethereum = typeof window !== "undefined" ? (window as any).ethereum : null;
    if (!ethereum) return;
    try {
      await ensureGenlayerWalletChain(ethereum);
    } catch { /* user rejected */ }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        await ensureGenlayerWalletChain(ethereum);
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        if (accounts?.length > 0) {
          setAddress(normalizeWalletAddress(accounts[0]));
        }
      } else {
        setError("no_wallet");
      }
    } catch (err: any) {
      setError(err.code === 4001 ? "rejected" : "error");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => { setAddress(null); setError(null); }, []);

  useEffect(() => {
    if (!address) {
      lastTrackedAddressRef.current = null;
      resetAnalyticsIdentity();
      return;
    }

    identifyWallet(address);

    const normalizedAddress = normalizeWalletAddress(address);
    if (lastTrackedAddressRef.current !== normalizedAddress) {
      trackWalletConnected(address);
      lastTrackedAddressRef.current = normalizedAddress;
    }
  }, [address]);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum;

      const handleAccounts = (accs: string[]) =>
        setAddress(accs.length > 0 ? normalizeWalletAddress(accs[0]) : null);
      const handleChainChanged = (id: string) => setChainId(id);

      eth.on("accountsChanged", handleAccounts);
      eth.on("chainChanged", handleChainChanged);

      eth.request({ method: "eth_accounts" }).then((accs: string[]) => {
        if (accs.length > 0) {
          setAddress(normalizeWalletAddress(accs[0]));
        }
      }).catch((err: unknown) => {
        console.warn("Failed to restore wallet session", err);
        setError((current) => current ?? "error");
      });

      eth.request({ method: "eth_chainId" }).then((id: string) => {
        setChainId(id);
      }).catch(() => {});

      return () => {
        eth.removeListener("accountsChanged", handleAccounts);
        eth.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  return (
    <Ctx.Provider value={{ address, isConnected: !!address, isConnecting, isCorrectNetwork, connect, disconnect, switchNetwork, error }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWallet() { return useContext(Ctx); }
