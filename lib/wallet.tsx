"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface WalletCtx {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

const Ctx = createContext<WalletCtx>({
  address: null, isConnected: false, isConnecting: false,
  connect: async () => {}, disconnect: () => {}, error: null,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        if (accounts?.length > 0) setAddress(accounts[0]);
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
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      const handler = (accs: string[]) => setAddress(accs.length > 0 ? accs[0] : null);
      eth.on("accountsChanged", handler);
      eth.request({ method: "eth_accounts" }).then((accs: string[]) => {
        if (accs.length > 0) setAddress(accs[0]);
      }).catch(() => {});
      return () => eth.removeListener("accountsChanged", handler);
    }
  }, []);

  return (
    <Ctx.Provider value={{ address, isConnected: !!address, isConnecting, connect, disconnect, error }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWallet() { return useContext(Ctx); }
