<script setup lang="ts">
import { onMounted, ref } from "vue";
import ContractCard from "./components/ContractCard.vue";
import { readClient, writeClient, type Network } from "./lib/genlayer";
import { useWallet, hasWallet } from "./lib/wallet";

const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ?? "") as `0x${string}`;
const NETWORK = ((import.meta.env.VITE_NETWORK as Network) || "studionet") as Network;

const { address, connecting, error: walletError, connect, disconnect } = useWallet();

const haveCoin = ref<boolean | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);

async function refresh() {
  if (!CONTRACT_ADDRESS) return;
  busy.value = true;
  error.value = null;
  try {
    const client = readClient(NETWORK);
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_have_coin",
      args: [],
    });
    haveCoin.value = Boolean(result);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function askForCoin() {
  if (!CONTRACT_ADDRESS) return;
  if (!address.value) {
    error.value = "Connect a wallet first.";
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    const client = writeClient(NETWORK, address.value);
    await client.connect(NETWORK);
    await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "ask_for_coin",
      args: ["Please give me the coin."],
      value: BigInt(0),
    });
    await refresh();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  refresh();
});
</script>

<template>
  <main>
    <h1>__PROJECT_NAME__</h1>

    <section class="card">
      <p>
        <strong>Wallet:</strong>
        <code v-if="address">{{ address }}</code>
        <span v-else class="muted">not connected</span>
      </p>
      <button v-if="!address" @click="connect" :disabled="connecting || !hasWallet()">
        {{ connecting ? "Connecting…" : hasWallet() ? "Connect wallet" : "No wallet detected" }}
      </button>
      <button v-else @click="disconnect">Disconnect</button>
    </section>

    <ContractCard
      :have-coin="haveCoin"
      :busy="busy"
      :can-write="Boolean(address)"
      @refresh="refresh"
      @ask="askForCoin"
    />

    <p v-if="walletError" class="err"><strong>Wallet error:</strong> {{ walletError }}</p>
    <p v-if="error" class="err"><strong>Error:</strong> {{ error }}</p>
  </main>
</template>
