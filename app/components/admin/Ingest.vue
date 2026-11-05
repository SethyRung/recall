<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

const emit = defineEmits<{
  ingested: [];
}>();

const toast = useToast();
const uploading = ref(false);
const previewing = ref(false);
const previewChunks = ref<AdminPreviewChunk[]>([]);
const files = ref<File[]>([]);
const pasteTitle = ref("");
const pasteContent = ref("");

const tabItems: TabsItem[] = [
  { label: "Upload", icon: "i-lucide-upload", slot: "upload" },
  { label: "Paste", icon: "i-lucide-clipboard-paste", slot: "paste" },
];

function reportResult(result: AdminIngestResult) {
  if (result.skipped > 0 && result.processed === 0) {
    toast.add({
      title: "Unchanged",
      description: `Skipped ${result.skipped} source(s) with the same content.`,
      icon: "i-lucide-minus",
      color: "neutral",
    });
  }

  if (result.processed > 0) {
    const replaced = result.replaced > 0 ? ` Replaced ${result.replaced}.` : "";
    const skipped = result.skipped > 0 ? ` Skipped ${result.skipped}.` : "";
    toast.add({
      title: "Ingest complete",
      description: `${result.processed} source(s), ${result.totalChunks} chunks.${replaced}${skipped}`,
      icon: "i-lucide-check",
      color: "success",
    });
  }

  for (const error of result.errors) {
    toast.add({
      title: `Failed: ${error.source}`,
      description: error.message,
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  }

  if (result.processed > 0) emit("ingested");
}

async function ingestFiles(next: File[] | null | undefined) {
  const selected = next ?? [];
  files.value = selected;
  if (selected.length === 0 || uploading.value) return;

  uploading.value = true;
  try {
    const form = new FormData();
    for (const file of selected) form.append("files", file);

    const result = await $fetch<AdminIngestResult>("/api/admin/ingest", {
      method: "POST",
      body: form,
    });
    reportResult(result);
  } catch (e) {
    toast.add({
      title: "Ingest failed",
      description: e instanceof Error ? e.message : "Unexpected error",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  } finally {
    uploading.value = false;
    files.value = [];
  }
}

async function ingestPaste() {
  const title = pasteTitle.value.trim();
  const content = pasteContent.value.trim();
  if (!title || !content || uploading.value) return;

  uploading.value = true;
  try {
    const result = await $fetch<AdminIngestResult>("/api/admin/ingest", {
      method: "POST",
      body: { title, content },
    });
    reportResult(result);
    if (result.processed > 0) {
      pasteTitle.value = "";
      pasteContent.value = "";
    }
  } catch (e) {
    toast.add({
      title: "Ingest failed",
      description: e instanceof Error ? e.message : "Unexpected error",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  } finally {
    uploading.value = false;
  }
}

async function previewPasteChunks() {
  const title = pasteTitle.value.trim() || "preview";
  const content = pasteContent.value.trim();
  if (!content || previewing.value) return;

  previewing.value = true;
  try {
    const result = await $fetch<AdminIngestResult>("/api/admin/ingest", {
      method: "POST",
      body: { title, content, dryRun: true },
    });
    previewChunks.value = result.previewChunks ?? [];
    toast.add({
      title: "Chunk preview",
      description: `${previewChunks.value.length} chunk(s) produced (dry-run).`,
      icon: "i-lucide-info",
      color: "neutral",
    });
  } catch (e) {
    toast.add({
      title: "Preview failed",
      description: e instanceof Error ? e.message : "Unexpected error",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  } finally {
    previewing.value = false;
  }
}
</script>

<template>
  <AdminPanel
    title="Add markdown"
    description="Same title replaces the existing document. .md up to 10MB."
  >
    <UTabs :items="tabItems" variant="link" :unmount-on-hide="false" class="w-full">
      <template #upload>
        <UFileUpload
          :model-value="files"
          icon="i-lucide-file-text"
          :label="uploading ? 'Embedding…' : 'Drop markdown files here'"
          description="or click to browse · .md / .markdown"
          accept=".md,.markdown,.mdown,.mkd,text/markdown"
          multiple
          :disabled="uploading"
          :preview="false"
          class="w-full min-h-40"
          @update:model-value="ingestFiles"
        />
      </template>

      <template #paste>
        <form class="space-y-3" @submit.prevent="ingestPaste">
          <UFormField label="Title" name="title">
            <UInput v-model="pasteTitle" placeholder="about" class="w-full" :disabled="uploading" />
          </UFormField>
          <UFormField label="Markdown" name="content">
            <UTextarea
              v-model="pasteContent"
              placeholder="# About&#10;&#10;Sethy is a full stack developer…"
              :rows="8"
              autoresize
              :maxrows="16"
              class="w-full font-mono text-sm"
              :disabled="uploading"
            />
          </UFormField>
          <div class="flex items-center gap-2">
            <UButton
              type="submit"
              label="Embed"
              icon="i-lucide-sparkles"
              :loading="uploading"
              :disabled="!pasteTitle.trim() || !pasteContent.trim()"
            />
            <UButton
              type="button"
              label="Preview Chunks"
              icon="i-lucide-eye"
              variant="outline"
              color="neutral"
              :loading="previewing"
              :disabled="uploading || !pasteContent.trim()"
              @click="previewPasteChunks"
            />
            <UButton
              v-if="previewChunks.length > 0"
              type="button"
              label="Clear Preview"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="previewChunks = []"
            />
          </div>

          <div v-if="previewChunks.length > 0" class="mt-4 space-y-2 border-t border-accented pt-3">
            <div class="flex items-center justify-between">
              <p class="font-mono text-xs uppercase tracking-[0.14em] text-muted">
                Dry-run Preview · {{ previewChunks.length }} Chunks
              </p>
            </div>
            <ol class="space-y-2 max-h-64 overflow-y-auto">
              <li
                v-for="chunk in previewChunks"
                :key="chunk.index"
                class="border border-accented bg-elevated/40 p-2.5 rounded-sm"
              >
                <p class="mb-1 font-mono text-[10px] text-muted">
                  Chunk {{ chunk.index + 1 }} · {{ chunk.length }} chars
                </p>
                <p class="whitespace-pre-wrap font-mono text-xs text-default">
                  {{ chunk.content }}
                </p>
              </li>
            </ol>
          </div>
        </form>
      </template>
    </UTabs>
  </AdminPanel>
</template>
