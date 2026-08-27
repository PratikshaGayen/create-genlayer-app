import type { JSX } from "react";

interface Props {
  haveCoin: boolean | null;
  busy: boolean;
  canWrite: boolean;
  onRefresh: () => void;
  onAsk: () => void;
}

export function ContractCard({
  haveCoin,
  busy,
  canWrite,
  onRefresh,
  onAsk,
}: Props): JSX.Element {
  return (
    <section className="card">
      <p>
        <strong>Wizard has coin:</strong>{" "}
        {haveCoin === null ? <span className="muted">unknown</span> : haveCoin ? "yes" : "no"}
      </p>
      <p style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={onRefresh} disabled={busy}>
          {busy ? "Refreshing…" : "Read (refresh)"}
        </button>
        <button onClick={onAsk} disabled={busy || !canWrite}>
          Ask for the coin
        </button>
      </p>
    </section>
  );
}
