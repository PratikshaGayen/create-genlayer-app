import { useEffect, useState } from "react";
import { ContractCard } from "./components/ContractCard";
import { readClient, writeClient, wizardAbi, type Network } from "./lib/genlayer";
import { useWallet, hasWallet } from "./lib/wallet";

const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ?? "") as `0x${string}`;
const NETWORK: Network =
  ((import.meta.env.VITE_NETWORK as Network) || "studionet") as Network;

export function App() {
  const wallet = useWallet();
  const [haveCoin, setHaveCoin] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1 read on mount: get_have_coin
  const refresh = async () => {
    if (!CONTRACT_ADDRESS) return;
    setBusy(true);
    setError(null);
    try {
      const client = readClient(NETWORK);
      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_have_coin",
        args: [],
      });
      setHaveCoin(Boolean(result));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // 1 write: ask_for_coin
  const askForCoin = async () => {
    if (!CONTRACT_ADDRESS) return;
    if (!wallet.state.address) {
      setError("Connect a wallet first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const client = writeClient(NETWORK, wallet.state.address);
      // Switch the wallet to the configured network before signing.
      await client.connect(NETWORK);
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "ask_for_coin",
        args: ["Please give me the coin."],
        value: BigInt(0),
      });
      // Read back via the read client (no wallet signature needed for the
      // receipt poll). Refresh state after the next block.
      await refresh();
      void txHash;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CONTRACT_ADDRESS) {
    return (
      <main>
        <h1>__PROJECT_NAME__</h1>
        <p className="muted">
          Set <code>VITE_CONTRACT_ADDRESS</code> in <code>app/.env</code> after
          deploying the contract.
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>__PROJECT_NAME__</h1>

      <section className="card">
        <p>
          <strong>Wallet:</strong>{" "}
          {wallet.state.address ? (
            <code>{wallet.state.address}</code>
          ) : (
            <span className="muted">not connected</span>
          )}
        </p>
        {!wallet.state.address ? (
          <button onClick={wallet.connect} disabled={wallet.state.connecting || !hasWallet()}>
            {wallet.state.connecting ? "Connecting…" : hasWallet() ? "Connect wallet" : "No wallet detected"}
          </button>
        ) : (
          <button onClick={wallet.disconnect}>Disconnect</button>
        )}
      </section>

      <ContractCard
        haveCoin={haveCoin}
        busy={busy}
        onRefresh={refresh}
        onAsk={askForCoin}
        canWrite={Boolean(wallet.state.address)}
      />

      {error && (
        <p className="err">
          <strong>Error:</strong> {error}
        </p>
      )}
    </main>
  );
}
