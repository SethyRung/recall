<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: ["admin"] });

const { data: stats, refresh: refreshStats } = await useFetch("/api/admin/stats");

const file = ref<File | null>(null);
const ingesting = ref(false);
const resetting = ref(false);

const toast = useToast();

async function ingest() {
  if (!file.value) return;
  ingesting.value = true;
  try {
    const body = new FormData();
    body.append("files", file.value, file.value.name);

    const res = await $fetch<{
      processed: number;
      totalChunks: number;
      errors: { source: string; message: string }[];
    }>("/api/admin/ingest", { method: "POST", body });

    if (res.processed > 0) {
      toast.add({
        title: "Ingest complete",
        description: `${res.processed} file, ${res.totalChunks} chunks`,
        color: "success",
        icon: "i-lucide-check",
      });
    }
    if (res.errors.length > 0) {
      toast.add({
        title: `${res.errors.length} file(s) failed`,
        description: res.errors.map((e) => `${e.source}: ${e.message}`).join("\n"),
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
    await $fetch("/api/admin/reset", { method: "POST" });
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
        <StatsPanel :stats="stats" />

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
