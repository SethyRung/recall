<script setup lang="ts">
import { isSuccessResponse } from "#shared/types";

definePageMeta({ layout: "admin", middleware: ["admin"] });

const { csrf, headerName } = useCsrf();

const { data: statsEnvelope, refresh: refreshStats } = await useCsrfFetch("/api/admin/stats");

const stats = computed(() => {
  const env = statsEnvelope.value;
  return isSuccessResponse(env) ? env.data : null;
});

const file = ref<File | null>(null);
const ingesting = ref(false);
const resetting = ref(false);

const toast = useToast();

async function ingest() {
  if (!file.value) return;
  try {
    ingesting.value = true;

    const body = new FormData();
    body.append("files", file.value, file.value.name);

    const res = await $fetch("/api/admin/ingest", {
      headers: {
        [headerName]: csrf,
      },
      method: "POST",
      body,
    });

    if (!isSuccessResponse(res)) throw new Error(res.status.message);

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
      description: e instanceof Error ? e.message : "Something went wrong",
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
    const res = await $fetch("/api/admin/reset", {
      headers: {
        [headerName]: csrf,
      },
      method: "POST",
    });

    if (!isSuccessResponse(res)) throw new Error(res.status.message);

    await refreshStats();
    toast.add({ title: "Database reset", color: "success", icon: "i-lucide-check" });
  } catch (e) {
    toast.add({
      title: "Reset failed",
      description: e instanceof Error ? e.message : "Something went wrong",
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
        <AdminStatsPanel v-if="stats" :stats="stats" />

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
          <AdminConfirmResetModal :loading="resetting" @confirm="reset" />
        </UPageCard>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
