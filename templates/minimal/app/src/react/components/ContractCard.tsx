import type { JSX } from "react";

interface Props {
  totalUpdates: number | null;
  busy: boolean;
  canWrite: boolean;
  onRefresh: () => void;
  onIncrement: () => void;
}

export function ContractCard({
  totalUpdates,
  busy,
  canWrite,
  onRefresh,
  onIncrement,
}: Props): JSX.Element {
  return (
    <section className="card">
      <p>
        <strong>Total updates:</strong>{" "}
        {totalUpdates === null ? <span className="muted">unknown</span> : totalUpdates}
      </p>
      <p style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={onRefresh} disabled={busy}>
          {busy ? "Refreshing…" : "Read (refresh)"}
        </button>
        <button onClick={onIncrement} disabled={busy || !canWrite}>
          Increment by 1
        </button>
      </p>
    </section>
  );
}
