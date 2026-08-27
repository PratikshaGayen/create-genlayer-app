// Single import surface for genlayer-js. The version is pinned in the
// workspace-root package.json — do not add a second copy anywhere.
//
// API surface (verbatim from https://github.com/genlayerlabs/genlayer-js):
//   createClient({ chain, account?, provider? })
//   client.readContract({ address, functionName, args, stateStatus })
//   client.writeContract({ account, address, functionName, args, value })
//   client.waitForTransactionReceipt({ hash, status, fullTransaction })
//   client.connect("studionet") // to switch the wallet to the right chain
//
// Available chain presets: localnet, studionet, testnetAsimov, testnetBradbury
//   (all importable from "genlayer-js/chains").
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
  return createClient({
    chain: chainFor(network),
    account,
    // The wallet provider is supplied by `wallet.ts`; calling code must
    // pass `account` after the user has connected.
  });
}

export const wizardAbi = [
  {
    type: "function",
    name: "get_have_coin",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "ask_for_coin",
    stateMutability: "nonpayable",
    inputs: [{ name: "request", type: "string" }],
    outputs: [],
  },
] as const;
