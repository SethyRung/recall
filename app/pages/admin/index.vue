<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

const KNOWLEDGE_SECTIONS = [
  { label: "Overview", value: "overview", icon: "i-lucide-chart-no-axes-combined" },
  { label: "Sources", value: "sources", icon: "i-lucide-files" },
  { label: "Test retrieval", value: "retrieval", icon: "i-lucide-search" },
  { label: "Maintenance", value: "maintenance", icon: "i-lucide-triangle-alert" },
] satisfies TabsItem[];

const { section } = useAdminSection(KNOWLEDGE_SECTIONS);

function sectionAttrs(value: string | number | undefined) {
  return { "data-admin-section": String(value ?? "") };
}

definePageMeta({
  layout: "admin",
  auth: { only: "user", user: { role: "admin" }, redirectTo: "/auth" },
});

useHead({ title: "Knowledge base" });

const emptyStats: AdminStats = {
  documents: 0,
  chunks: 0,
  emptyDocuments: 0,
  totalChars: 0,
  avgChunksPerDoc: 0,
  lastIngest: null,
  pipeline: {
    llm: { model: null, configured: false },
    embed: {
      model: null,
      configured: false,
      topK: 5,
      similarityThreshold: 0.3,
      chunkSize: 500,
      chunkOverlap: 50,
      dimensions: 2048,
      hybrid: true,
      rerank: false,
    },
  },
};

const {
  data: stats,
  refresh: refreshStats,
  status: statsStatus,
} = await useFetch<AdminStats>("/api/admin/stats", {
  default: () => emptyStats,
});

const {
  data: documents,
  refresh: refreshDocuments,
  status: documentsStatus,
} = await useFetch("/api/admin/documents", {
  default: () => [],
});

const loading = computed(
  () => statsStatus.value === "pending" || documentsStatus.value === "pending",
);

async function refreshAll() {
  await Promise.all([refreshStats(), refreshDocuments()]);
}
</script>

<template>
  <UDashboardPanel id="knowledge-base" :ui="{ body: 'p-0' }">
    <template #header>
      <UDashboardNavbar title="Knowledge base">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right><UColorModeButton /></template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <template #left>
          <UBadge :label="`${stats?.documents ?? 0} documents`" color="neutral" variant="subtle" />
          <UBadge :label="`${stats?.chunks ?? 0} chunks`" color="neutral" variant="subtle" />
        </template>
        <template #right>
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            :loading="loading"
            @click="refreshAll"
          />
        </template>
      </UDashboardToolbar>
    </template>
    <template #body>
      <UContainer class="w-full max-w-6xl py-6 space-y-6">
        <USelect
          v-model="section"
          :items="KNOWLEDGE_SECTIONS"
          aria-label="Knowledge section"
          class="w-full sm:hidden"
        />
        <UTabs
          v-model="section"
          :items="KNOWLEDGE_SECTIONS"
          :unmount-on-hide="false"
          variant="link"
          :ui="{
            list: 'hidden sm:flex',
            content: 'space-y-6',
          }"
        >
          <template #content="{ item }">
            <div v-bind="sectionAttrs(item.value)" class="space-y-6">
              <template v-if="item.value === 'overview'">
                <AdminStatGrid :stats="stats ?? emptyStats" />
                <AdminPipeline :pipeline="(stats ?? emptyStats).pipeline" />
              </template>
              <template v-else-if="item.value === 'sources'">
                <AdminIngest @ingested="refreshAll" />
                <AdminDocuments
                  :documents="documents ?? []"
                  :loading="loading"
                  @changed="refreshAll"
                />
              </template>
              <template v-else-if="item.value === 'retrieval'">
                <AdminRetrieve
                  :configured="(stats ?? emptyStats).pipeline.embed.configured"
                  :has-chunks="(stats ?? emptyStats).chunks > 0"
                />
              </template>
              <template v-else-if="item.value === 'maintenance'">
                <AdminDanger @reset="refreshAll" />
              </template>
            </div>
          </template>
        </UTabs>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
