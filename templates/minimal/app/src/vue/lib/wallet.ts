// Browser wallet helpers (Vue).
import { ref, onMounted } from "vue";

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

export function useWallet() {
  const address = ref<`0x${string}` | null>(null);
  const connecting = ref(false);
  const error = ref<string | null>(null);

  const connect = async () => {
    if (!hasWallet()) {
      error.value = "No injected wallet found (window.ethereum).";
      return;
    }
    connecting.value = true;
    error.value = null;
    try {
      const accounts = (await window.ethereum!.request({
        method: "eth_requestAccounts",
      })) as string[];
      address.value = (accounts[0] ?? null) as `0x${string}` | null;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      connecting.value = false;
    }
  };

  const disconnect = () => {
    address.value = null;
  };

  onMounted(async () => {
    if (!hasWallet()) return;
    try {
      const accounts = (await window.ethereum!.request({
        method: "eth_accounts",
      })) as string[];
      if (accounts.length > 0) {
        address.value = accounts[0] as `0x${string}`;
      }
    } catch {
      // user denied / no account
    }
  });

  return { address, connecting, error, connect, disconnect, hasWallet };
}
