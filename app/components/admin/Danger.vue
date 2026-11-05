<script setup lang="ts">
const emit = defineEmits<{
  reset: [];
}>();

const toast = useToast();
const open = ref(false);
const resetting = ref(false);
const confirmText = ref("");

const canReset = computed(() => confirmText.value.trim().toLowerCase() === "reset");

async function onReset() {
  if (!canReset.value) return;
  resetting.value = true;
  try {
    await $fetch("/api/admin/reset", { method: "POST" });
    toast.add({
      title: "Knowledge base reset",
      description: "All documents and chunks were deleted.",
      icon: "i-lucide-check",
      color: "success",
    });
    emit("reset");
  } catch (e) {
    toast.add({
      title: "Reset failed",
      description: e instanceof Error ? e.message : "Unexpected error",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  } finally {
    resetting.value = false;
    open.value = false;
    confirmText.value = "";
  }
}

watch(open, (value) => {
  if (!value) confirmText.value = "";
});
</script>

<template>
  <AdminPanel title="Reset knowledge base">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-muted">
        Permanently delete every document and chunk. The chat bot will have nothing to answer from
        until you ingest again.
      </p>
      <UButton
        label="Reset"
        icon="i-lucide-trash-2"
        color="error"
        variant="soft"
        class="shrink-0"
        @click="open = true"
      />
    </div>

    <UModal v-model:open="open" title="Reset knowledge base">
      <template #body>
        <p class="text-sm text-muted">
          This cannot be undone. Type
          <span class="font-mono text-highlighted">reset</span>
          to confirm.
        </p>
        <UInput v-model="confirmText" placeholder="reset" class="mt-3 w-full" autocomplete="off" />
      </template>
      <template #footer>
        <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
        <UButton
          label="Delete everything"
          color="error"
          :disabled="!canReset"
          :loading="resetting"
          @click="onReset"
        />
      </template>
    </UModal>
  </AdminPanel>
</template>
