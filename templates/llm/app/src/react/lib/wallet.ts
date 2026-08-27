// Browser wallet helpers. We follow the standard viem pattern: a read
// client talks to the RPC directly, a write client is signed by the
// connected wallet (`window.ethereum`, which MetaMask and most other
// EIP-1193 wallets expose).
//
// Reference: https://github.com/genlayerlabs/genlayer-js#using-with-a-wallet-provider-metamask

import { useCallback, useEffect, useState } from "react";

export interface WalletState {
  address: `0x${string}` | null;
  connecting: boolean;
  error: string | null;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export function hasWallet(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

export function useWallet(): {
  state: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
} {
  const [state, setState] = useState<WalletState>({
    address: null,
    connecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    if (!hasWallet()) {
      setState((s) => ({ ...s, error: "No injected wallet found (window.ethereum)." }));
      return;
    }
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const accounts = (await window.ethereum!.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = (accounts[0] ?? null) as `0x${string}` | null;
      setState({ address, connecting: false, error: null });
    } catch (e) {
      setState({ address: null, connecting: false, error: (e as Error).message });
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, connecting: false, error: null });
  }, []);

  useEffect(() => {
    if (!hasWallet()) return;
    // Re-pick up the current account if the user is already connected.
    window.ethereum!.request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as string[];
        if (list.length > 0) {
          setState({ address: list[0] as `0x${string}`, connecting: false, error: null });
        }
      })
      .catch(() => { /* user denied / no account */ });
  }, []);

  return { state, connect, disconnect };
}
