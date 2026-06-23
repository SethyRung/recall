<script setup lang="ts">
const props = defineProps<{ loading?: boolean }>();
const emit = defineEmits<{ confirm: [] }>();
const open = ref(false);
</script>

<template>
  <UModal
    v-model:open="open"
    :title="'Reset database?'"
    :description="'This deletes all documents and chunks. Cannot be undone.'"
  >
    <UButton icon="i-lucide-trash-2" label="Reset database" color="error" variant="soft" block />
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="outline" label="Cancel" @click="open = false" />
        <UButton
          color="error"
          :loading="props.loading"
          label="Reset"
          @click="
            emit('confirm');
            open = false;
          "
        />
      </div>
    </template>
  </UModal>
</template>
