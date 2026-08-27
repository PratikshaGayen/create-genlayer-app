<script setup lang="ts">
defineProps<{
  haveCoin: boolean | null;
  busy: boolean;
  canWrite: boolean;
}>();

defineEmits<{
  (e: "refresh"): void;
  (e: "ask"): void;
}>();
</script>

<template>
  <section class="card">
    <p>
      <strong>Wizard has coin:</strong>
      <span v-if="haveCoin === null" class="muted">unknown</span>
      <span v-else>{{ haveCoin ? "yes" : "no" }}</span>
    </p>
    <p style="display: flex; gap: 0.5rem">
      <button @click="$emit('refresh')" :disabled="busy">
        {{ busy ? "Refreshing…" : "Read (refresh)" }}
      </button>
      <button @click="$emit('ask')" :disabled="busy || !canWrite">
        Ask for the coin
      </button>
    </p>
  </section>
</template>
