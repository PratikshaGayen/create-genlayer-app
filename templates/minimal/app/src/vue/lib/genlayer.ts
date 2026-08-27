// Single import surface for genlayer-js (Vue variant).
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
