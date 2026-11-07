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
  <div class="grid grid-cols-2 border-t border-l border-accented bg-muted/20 xl:grid-cols-4">
    <div
      v-for="item in items"
      :key="item.kicker"
      class="min-w-0 border-r border-b border-accented px-4 py-5 sm:px-5"
    >
      <p class="text-xs uppercase tracking-widest text-muted">{{ item.kicker }}</p>

      <p class="mt-3 font-pixel text-2xl leading-tight text-highlighted sm:text-3xl">
        {{ item.value }}
      </p>

      <p class="mt-2 text-xs leading-5" :class="item.warn ? 'text-warning' : 'text-muted'">
        {{ item.hint }}
      </p>
    </div>
  </div>
</template>
