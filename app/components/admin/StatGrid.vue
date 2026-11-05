<script setup lang="ts">
const props = defineProps<{
  stats: AdminStats;
}>();

const items = computed(() => [
  {
    kicker: "Documents",
    value: formatCompact(props.stats.documents),
    hint:
      props.stats.emptyDocuments > 0
        ? `${props.stats.emptyDocuments} with no chunks`
        : "Sources in the knowledge base",
    warn: props.stats.emptyDocuments > 0,
  },
  {
    kicker: "Chunks",
    value: formatCompact(props.stats.chunks),
    hint:
      props.stats.documents === 0
        ? "Nothing embedded yet"
        : `${props.stats.avgChunksPerDoc} avg per document`,
    warn: false,
  },
  {
    kicker: "Corpus",
    value: formatCompact(props.stats.totalChars),
    hint: "Characters of markdown",
    warn: false,
  },
  {
    kicker: "Last ingest",
    value: formatRelativeTime(props.stats.lastIngest),
    hint: formatDateTime(props.stats.lastIngest),
    warn: !props.stats.lastIngest,
  },
]);
</script>

<template>
  <div class="grid grid-cols-2 border-t border-l border-accented lg:grid-cols-4">
    <div
      v-for="item in items"
      :key="item.kicker"
      class="border-r border-b border-accented px-5 py-4"
    >
      <p class="font-mono text-xs uppercase tracking-[0.14em] text-muted">{{ item.kicker }}</p>

      <p class="mt-1 text-2xl font-bold tracking-tight text-highlighted">{{ item.value }}</p>

      <p class="mt-1 text-xs" :class="item.warn ? 'text-warning' : 'text-dimmed'">
        {{ item.hint }}
      </p>
    </div>
  </div>
</template>
