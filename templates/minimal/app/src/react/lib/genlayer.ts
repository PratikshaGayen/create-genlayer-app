// Single import surface for genlayer-js (React variant). The version is
// pinned in the workspace-root package.json — do not add a second copy
// anywhere.
//
// API surface (verbatim from https://github.com/genlayerlabs/genlayer-js):
//   createClient({ chain, account?, provider? })
//   client.readContract({ address, functionName, args, stateStatus })
//   client.writeContract({ account, address, functionName, args, value })
//   client.waitForTransactionReceipt({ hash, status, fullTransaction })
//   client.connect("studionet") // to switch the wallet to the right chain
import { createClient } from "genlayer-js";
import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";
import type { Address, Chain } from "genlayer-js";

export type Network = "localnet" | "studionet" | "testnet_asimov" | "testnet_bradbury";

const CHAINS: Record<Network, Chain> = {
  localnet,
  studionet,
  testnet_asimov: testnetAsimov,
  testnet_bradbury: testnetBradbury,
};

export function chainFor(network: Network): Chain {
  return CHAINS[network] ?? localnet;
}

export function readClient(network: Network) {
  return createClient({ chain: chainFor(network) });
}

export function writeClient(network: Network, account: Address) {
  return createClient({ chain: chainFor(network), account });
}

export const storageAbi = [
  {
    type: "function",
    name: "get_balance",
    stateMutability: "view",
    inputs: [{ name: "holder", type: "string" }],
    outputs: [{ name: "", type: "int" }],
  },
  {
    type: "function",
    name: "get_total_updates",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "int" }],
  },
  {
    type: "function",
    name: "increment",
    stateMutability: "nonpayable",
    inputs: [{ name: "by", type: "int" }],
    outputs: [],
  },
] as const;
