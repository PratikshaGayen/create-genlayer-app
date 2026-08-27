<script setup lang="ts">
defineProps<{
  totalUpdates: number | null;
  busy: boolean;
  canWrite: boolean;
}>();

defineEmits<{
  (e: "refresh"): void;
  (e: "increment"): void;
}>();
</script>

<template>
  <section class="card">
    <p>
      <strong>Total updates:</strong>
      <span v-if="totalUpdates === null" class="muted">unknown</span>
      <span v-else>{{ totalUpdates }}</span>
    </p>
    <p style="display: flex; gap: 0.5rem">
      <button @click="$emit('refresh')" :disabled="busy">
        {{ busy ? "Refreshing…" : "Read (refresh)" }}
      </button>
      <button @click="$emit('increment')" :disabled="busy || !canWrite">
        Increment by 1
      </button>
    </p>
  </section>
</template>
