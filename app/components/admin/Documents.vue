<script setup lang="ts">
import type { TableColumn, TabsItem } from "@nuxt/ui";
import { Markdown } from "@comark/vue";
import security from "comark/plugins/security";

const previewPlugins = [
  security({ blockedTags: ["script", "style", "iframe", "object", "embed", "form"] }),
];

defineProps<{
  documents: AdminDocument[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  changed: [];
}>();

const toast = useToast();
const globalFilter = ref<string | undefined>("");
const open = ref(false);
const deletingId = ref<string | null>(null);
const pendingDelete = ref<AdminDocument | null>(null);
const detail = ref<AdminDocumentDetail | null>(null);
const detailPending = ref(false);
const tab = ref<string | number>("preview");

const tabItems: TabsItem[] = [
  { label: "Preview", icon: "i-lucide-eye", value: "preview", slot: "preview" },
  { label: "Source", icon: "i-lucide-code", value: "source", slot: "source" },
  { label: "Chunks", icon: "i-lucide-layers", value: "chunks", slot: "chunks" },
];

const columns: TableColumn<AdminDocument>[] = [
  { accessorKey: "title", header: "Title" },
  {
    accessorKey: "chunkCount",
    header: "Chunks",
    meta: { class: { th: "text-right", td: "text-right" } },
  },
  {
    accessorKey: "contentLength",
    header: "Size",
    meta: { class: { th: "text-right", td: "text-right" } },
  },
  { accessorKey: "updatedAt", header: "Updated" },
  { id: "actions" },
];

function titleOf(doc: Pick<AdminDocument, "title">) {
  return doc.title?.trim() || "untitled";
}

function rowId(row: { id?: string }) {
  return row.id ?? "";
}

async function openDoc(doc: AdminDocument) {
  open.value = true;
  detail.value = null;
  detailPending.value = true;
  tab.value = "preview";
  try {
    detail.value = await $fetch<AdminDocumentDetail>(`/api/admin/documents/${doc.id}`);
  } catch (e) {
    toast.add({
      title: "Failed to load document",
      description: e instanceof Error ? e.message : "Unexpected error",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
    open.value = false;
  } finally {
    detailPending.value = false;
  }
}

function download(doc: AdminDocumentDetail) {
  const blob = new Blob([doc.content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${titleOf(doc)}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadByRow(doc: AdminDocument) {
  try {
    const full = await $fetch<AdminDocumentDetail>(`/api/admin/documents/${doc.id}`);
    download(full);
  } catch (e) {
    toast.add({
      title: "Download failed",
      description: e instanceof Error ? e.message : "Unexpected error",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  }
}

async function onDelete() {
  const target = pendingDelete.value;
  if (!target) return;
  deletingId.value = target.id;
  try {
    await $fetch(`/api/admin/documents/${target.id}`, { method: "DELETE" });
    toast.add({
      title: "Document deleted",
      description: titleOf(target),
      icon: "i-lucide-check",
      color: "success",
    });
    if (detail.value?.id === target.id) {
      open.value = false;
      detail.value = null;
    }
    emit("changed");
  } catch (e) {
    toast.add({
      title: "Delete failed",
      description: e instanceof Error ? e.message : "Unexpected error",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  } finally {
    deletingId.value = null;
    pendingDelete.value = null;
  }
}
</script>

<template>
  <AdminPanel
    title="Documents"
    :description="
      documents.length === 0
        ? 'Upload markdown to give the chat bot something to retrieve.'
        : `${documents.length} source${documents.length === 1 ? '' : 's'}`
    "
  >
    <template #actions>
      <UInput
        v-model="globalFilter"
        icon="i-lucide-search"
        placeholder="Filter…"
        class="w-44"
        size="sm"
      />
    </template>

    <UTable
      v-model:global-filter="globalFilter"
      :data="documents"
      :columns="columns"
      :loading="loading"
      :get-row-id="rowId"
      empty="No documents yet"
      class="w-full"
      @select="(_e, row) => openDoc(row.original)"
    >
      <template #title-cell="{ row }">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon name="i-lucide-file-text" class="size-4 shrink-0 text-muted" />
          <span class="truncate font-medium text-highlighted">{{ titleOf(row.original) }}</span>
          <UBadge
            v-if="row.original.chunkCount === 0"
            color="warning"
            variant="subtle"
            size="sm"
            label="empty"
          />
        </div>
      </template>

      <template #chunkCount-cell="{ row }">
        <span class="font-mono text-sm">{{ row.original.chunkCount }}</span>
      </template>

      <template #contentLength-cell="{ row }">
        <span class="font-mono text-sm text-muted">{{
          formatCompact(row.original.contentLength)
        }}</span>
      </template>

      <template #updatedAt-cell="{ row }">
        <UTooltip :text="formatDateTime(row.original.updatedAt)">
          <span class="text-sm text-muted">{{ formatRelativeTime(row.original.updatedAt) }}</span>
        </UTooltip>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1" @click.stop>
          <UButton
            icon="i-lucide-eye"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            label="View"
            :ui="{ label: 'sr-only' }"
            @click="openDoc(row.original)"
          />
          <UButton
            icon="i-lucide-download"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            label="Download"
            :ui="{ label: 'sr-only' }"
            @click="downloadByRow(row.original)"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            square
            label="Delete"
            :ui="{ label: 'sr-only' }"
            :loading="deletingId === row.original.id"
            @click="pendingDelete = row.original"
          />
        </div>
      </template>
    </UTable>

    <USlideover
      v-model:open="open"
      :title="detail ? titleOf(detail) : 'Document'"
      :description="
        detail
          ? `${detail.chunkCount} chunks · ${formatCompact(detail.contentLength)} chars · ${formatDateTime(detail.updatedAt)}${detail.metadata?.embedModel ? ` · ${detail.metadata.embedModel}` : ''}`
          : 'Loading…'
      "
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <div v-if="detailPending" class="flex justify-center py-16">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
        </div>

        <div v-else-if="detail" class="space-y-4">
          <div v-if="detail.metadata?.tags?.length" class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="tag in detail.metadata.tags"
              :key="tag"
              size="xs"
              variant="subtle"
              color="neutral"
              :label="tag"
            />
          </div>

          <UTabs v-model="tab" :items="tabItems" variant="link" class="w-full">
            <template #preview>
              <div class="chat-markdown text-sm leading-relaxed text-default">
                <Markdown :value="detail.content" :plugins="previewPlugins" />
              </div>
            </template>
            <template #source>
              <pre
                class="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted"
                >{{ detail.content }}</pre>
            </template>
            <template #chunks>
              <div v-if="detail.chunks.length === 0" class="py-8 text-center text-sm text-muted">
                No chunks. Re-ingest this source.
              </div>
              <ol v-else class="space-y-3">
                <li
                  v-for="chunk in detail.chunks"
                  :key="chunk.id"
                  class="border border-accented p-3"
                >
                  <p class="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                    Chunk {{ chunk.index + 1 }} · {{ formatCompact(chunk.content.length) }} chars
                  </p>
                  <p class="whitespace-pre-wrap text-sm text-default">{{ chunk.content }}</p>
                </li>
              </ol>
            </template>
          </UTabs>
        </div>
      </template>

      <template #footer>
        <UButton
          label="Download"
          icon="i-lucide-download"
          color="neutral"
          variant="ghost"
          :disabled="!detail"
          @click="detail && download(detail)"
        />
        <UButton
          label="Delete"
          icon="i-lucide-trash-2"
          color="error"
          variant="soft"
          :disabled="!detail"
          @click="detail && (pendingDelete = detail)"
        />
      </template>
    </USlideover>

    <UModal
      :open="!!pendingDelete"
      title="Delete document"
      @update:open="(value) => !value && (pendingDelete = null)"
    >
      <template #body>
        <p class="text-sm text-muted">
          Delete
          <span class="font-medium text-highlighted">{{
            pendingDelete ? titleOf(pendingDelete) : ""
          }}</span>
          and its chunks. The chat bot will no longer retrieve this source.
        </p>
      </template>
      <template #footer>
        <UButton label="Cancel" color="neutral" variant="ghost" @click="pendingDelete = null" />
        <UButton label="Delete" color="error" :loading="!!deletingId" @click="onDelete" />
      </template>
    </UModal>
  </AdminPanel>
</template>
