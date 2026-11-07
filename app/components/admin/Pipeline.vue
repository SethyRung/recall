<script setup lang="ts">
const props = defineProps<{
  pipeline: AdminPipeline;
}>();

const items = computed(() => [
  {
    label: "LLM",
    value: props.pipeline.llm.model ?? "not set",
    ok: props.pipeline.llm.configured,
  },
  {
    label: "Embeddings",
    value: props.pipeline.embed.model ?? "not set",
    ok: props.pipeline.embed.configured,
  },
  {
    label: "Top K",
    value: String(props.pipeline.embed.topK),
    ok: true,
  },
  {
    label: "Threshold",
    value: String(props.pipeline.embed.similarityThreshold),
    ok: true,
  },
  {
    label: "Chunk size",
    value: String(props.pipeline.embed.chunkSize),
    ok: true,
  },
  {
    label: "Overlap",
    value: String(props.pipeline.embed.chunkOverlap),
    ok: true,
  },
  {
    label: "Dimensions",
    value: String(props.pipeline.embed.dimensions),
    ok: true,
  },
  {
    label: "Hybrid search",
    value: props.pipeline.embed.hybrid ? "enabled" : "disabled",
    ok: true,
  },
  {
    label: "Rerank",
    value: props.pipeline.embed.rerank ? "enabled" : "disabled",
    ok: true,
  },
]);
</script>

<template>
  <AdminPanel
    title="Retrieval config"
    description="Read-only snapshot of the models and chunking used by the chat bot."
  >
    <template #actions>
      <UBadge
        v-if="pipeline.embed.modelMismatch"
        color="warning"
        variant="subtle"
        label="Model Mismatch"
      />
      <UBadge
        v-else
        :color="pipeline.llm.configured && pipeline.embed.configured ? 'success' : 'warning'"
        variant="subtle"
        :label="pipeline.llm.configured && pipeline.embed.configured ? 'Ready' : 'Incomplete'"
      />
    </template>

    <dl class="divide-y divide-accented border border-accented">
      <div
        v-for="item in items"
        :key="item.label"
        class="flex items-center justify-between gap-4 px-3 py-2"
      >
        <dt class="font-mono text-xs uppercase tracking-widest text-muted">{{ item.label }}</dt>
        <dd class="flex min-w-0 items-center gap-2">
          <span class="truncate font-mono text-xs text-highlighted" :title="item.value">
            {{ item.value }}
          </span>
          <UIcon
            :name="item.ok ? 'i-lucide-check' : 'i-lucide-triangle-alert'"
            class="size-3.5 shrink-0"
            :class="item.ok ? 'text-success' : 'text-warning'"
          />
        </dd>
      </div>
    </dl>

    <p v-if="pipeline.embed.modelMismatch" class="mt-3 text-xs text-warning">
      Some documents were embedded with a previous model. Re-ingesting the corpus is recommended.
    </p>
    <p v-else class="mt-3 text-xs text-dimmed">
      Manage models, credentials and retrieval in
      <NuxtLink to="/admin/settings" class="text-primary underline">Admin settings</NuxtLink>
      <span>.</span>
      Changes apply to new requests without a restart.
    </p>
  </AdminPanel>
</template>
