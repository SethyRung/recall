<script setup lang="ts">
import { isSuccessResponse, type ApiResponse, type IngestResult } from "#shared/types";

definePageMeta({ layout: "admin", middleware: ["admin"] });

type Stats = { documents: number; chunks: number; lastIngest: string | null };

const { data: statsEnvelope, refresh: refreshStats } = await useFetch<ApiResponse<Stats>>(
  "/api/admin/stats",
);

const stats = computed<Stats | null>(() => {
  const env = statsEnvelope.value;
  return env && isSuccessResponse(env) ? env.data : null;
});

const file = ref<File | null>(null);
const ingesting = ref(false);
const resetting = ref(false);

const toast = useToast();

const unwrap = <T>(res: ApiResponse<T>): T => {
  if (!isSuccessResponse(res)) {
    throw new Error(res.status.message || "Request failed");
  }
  return res.data;
};

async function ingest() {
  if (!file.value) return;
  ingesting.value = true;
  try {
    const body = new FormData();
    body.append("files", file.value, file.value.name);

    const res = await $fetch<ApiResponse<IngestResult>>("/api/admin/ingest", {
      method: "POST",
      body,
    });

    const data = unwrap(res);

    if (data.processed > 0) {
      toast.add({
        title: "Ingest complete",
        description: `${data.processed} file, ${data.totalChunks} chunks`,
        color: "success",
        icon: "i-lucide-check",
      });
    }
    if (data.errors.length > 0) {
      toast.add({
        title: `${data.errors.length} file(s) failed`,
        description: data.errors.map((e) => `${e.source}: ${e.message}`).join("\n"),
        color: "warning",
        icon: "i-lucide-alert-triangle",
      });
    }
    file.value = null;
    await refreshStats();
  } catch (e) {
    toast.add({
      title: "Ingest failed",
      description: (e as Error).message,
      color: "error",
      icon: "i-lucide-alert-triangle",
    });
  } finally {
    ingesting.value = false;
  }
}

async function reset() {
  resetting.value = true;
  try {
    const res = await $fetch<ApiResponse<{ ok: true }>>("/api/admin/reset", {
      method: "POST",
    });
    unwrap(res);
    await refreshStats();
    toast.add({ title: "Database reset", color: "success", icon: "i-lucide-check" });
  } catch (e) {
    toast.add({
      title: "Reset failed",
      description: (e as Error).message,
      color: "error",
      icon: "i-lucide-alert-triangle",
    });
  } finally {
    resetting.value = false;
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #body>
      <UContainer class="py-6 space-y-6">
        <StatsPanel v-if="stats" :stats="stats" />

        <UPageCard title="Ingest" icon="i-lucide-database">
          <div class="space-y-4">
            <UFileUpload
              v-model="file"
              accept=".md,.markdown,.mdown,.mkd,text/markdown,text/plain"
              label="Drop a markdown file here"
              description="Or click to browse. .md files only."
              layout="list"
              position="inside"
              class="w-full"
            />
            <UButton
              icon="i-lucide-upload"
              label="Ingest file"
              :loading="ingesting"
              :disabled="!file"
              block
              @click="ingest"
            />
          </div>
        </UPageCard>

        <UPageCard title="Danger zone" icon="i-lucide-alert-triangle">
          <ConfirmResetModal :loading="resetting" @confirm="reset" />
        </UPageCard>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
