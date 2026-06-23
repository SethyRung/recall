<script setup lang="ts">
defineProps<{
  stats: { documents: number; chunks: number; lastIngest: string | null };
}>();
</script>

<template>
  <UPageCard title="Stats" icon="i-lucide-bar-chart-3">
    <div class="grid grid-cols-3 gap-4">
      <div>
        <div class="text-2xl font-semibold">{{ stats.documents }}</div>
        <div class="text-sm text-muted">Documents</div>
      </div>
      <div>
        <div class="text-2xl font-semibold">{{ stats.chunks }}</div>
        <div class="text-sm text-muted">Chunks</div>
      </div>
      <div>
        <div class="text-sm font-medium">
          {{ stats.lastIngest ? new Date(stats.lastIngest).toLocaleString() : "Never" }}
        </div>
        <div class="text-sm text-muted">Last ingest</div>
      </div>
    </div>
  </UPageCard>
</template>
