<script setup lang="ts">
defineProps<{
  configured: boolean;
  hasChunks: boolean;
}>();

const toast = useToast();
const query = ref("");
const pending = ref(false);
const result = ref<AdminRetrieveResult | null>(null);

const samples = [
  "What projects has Sethy built?",
  "What are Sethy's skills?",
  "How can I contact Sethy?",
];

const passedCount = computed(() => result.value?.hits.filter((hit) => hit.passed).length ?? 0);

async function run(text?: string) {
  const value = (text ?? query.value).trim();
  if (!value || pending.value) return;
  query.value = value;
  pending.value = true;
  try {
    result.value = await $fetch<AdminRetrieveResult>("/api/admin/retrieve", {
      method: "POST",
      body: { query: value },
    });
  } catch (e) {
    toast.add({
      title: "Retrieval failed",
      description: e instanceof Error ? e.message : "Unexpected error",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  } finally {
    pending.value = false;
  }
}

function titleOf(hit: AdminRetrieveHit) {
  return hit.documentTitle?.trim() || "untitled";
}
</script>

<template>
  <AdminPanel
    title="Test retrieval"
    description="Run the same search the chat uses. Scores show vector similarity; keyword matches can also pass below the threshold."
  >
    <form class="flex flex-col gap-2 sm:flex-row" @submit.prevent="run()">
      <UInput
        v-model="query"
        icon="i-lucide-scan-search"
        placeholder="Ask something the bot should retrieve…"
        class="flex-1"
        :disabled="pending || !configured || !hasChunks"
      />
      <UButton
        type="submit"
        label="Retrieve"
        icon="i-lucide-play"
        :loading="pending"
        :disabled="!query.trim() || !configured || !hasChunks"
      />
    </form>

    <p v-if="!configured" class="mt-3 text-sm text-warning">
      Embedding provider is not configured. Add its model and credential in
      <NuxtLink to="/admin/settings?section=knowledge" class="text-primary underline">
        Knowledge settings
      </NuxtLink>
      <span>.</span>
    </p>
    <p v-else-if="!hasChunks" class="mt-3 text-sm text-warning">
      Knowledge base is empty. Ingest markdown first.
    </p>

    <div v-else class="mt-3 flex flex-wrap gap-2">
      <UButton
        v-for="sample in samples"
        :key="sample"
        :label="sample"
        color="neutral"
        variant="outline"
        size="xs"
        :disabled="pending"
        @click="run(sample)"
      />
    </div>

    <div v-if="result" class="mt-5 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="font-mono text-xs uppercase tracking-widest text-muted">
          {{ passedCount }}/{{ result.hits.length }} passed · k={{ result.topK }} · threshold
          {{ result.threshold }}
        </p>
      </div>

      <UEmpty
        v-if="result.hits.length === 0"
        icon="i-lucide-circle-off"
        variant="naked"
        title="No chunks returned"
        description="The knowledge base has no embeddings, or the embedding request failed."
      />

      <article v-for="(hit, i) in result.hits" :key="hit.id" class="border border-accented p-4">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2">
            <span class="font-mono text-xs text-muted">#{{ i + 1 }}</span>
            <span class="truncate text-sm font-medium text-highlighted">{{ titleOf(hit) }}</span>
            <UBadge
              :color="hit.passed ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
              :label="hit.passed ? 'pass' : 'below threshold'"
            />
            <UBadge
              v-if="hit.lexicalMatch"
              label="keyword match"
              color="neutral"
              variant="subtle"
              size="sm"
            />
          </div>
          <span class="font-mono text-xs text-muted">{{ formatPercent(hit.similarity) }}</span>
        </div>
        <UProgress
          :model-value="Math.round(Math.min(1, Math.max(0, hit.similarity)) * 100)"
          :color="hit.passed ? 'success' : 'neutral'"
          size="2xs"
        />
        <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-default">
          {{ hit.content }}
        </p>
      </article>
    </div>
  </AdminPanel>
</template>
