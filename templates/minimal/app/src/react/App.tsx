import { useEffect, useState } from "react";
import { ContractCard } from "./components/ContractCard";
import { readClient, writeClient, type Network } from "./lib/genlayer";
import { useWallet, hasWallet } from "./lib/wallet";

const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ?? "") as `0x${string}`;
const NETWORK: Network =
  ((import.meta.env.VITE_NETWORK as Network) || "studionet") as Network;

export function App() {
  const wallet = useWallet();
  const [totalUpdates, setTotalUpdates] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1 read: get_total_updates
  const refresh = async () => {
    if (!CONTRACT_ADDRESS) return;
    setBusy(true);
    setError(null);
    try {
      const client = readClient(NETWORK);
      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_total_updates",
        args: [],
      });
      setTotalUpdates(Number(result));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // 1 write: increment(1)
  const increment = async () => {
    if (!CONTRACT_ADDRESS) return;
    if (!wallet.state.address) {
      setError("Connect a wallet first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const client = writeClient(NETWORK, wallet.state.address);
      await client.connect(NETWORK);
      await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "increment",
        args: [1],
        value: BigInt(0),
      });
      await refresh();
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
        totalUpdates={totalUpdates}
        busy={busy}
        onRefresh={refresh}
        onIncrement={increment}
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
