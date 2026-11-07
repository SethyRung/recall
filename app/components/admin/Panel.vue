<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <section class="min-w-0 border border-accented bg-default">
    <header
      v-if="title || description || $slots.actions"
      class="flex flex-wrap items-start justify-between gap-3 border-b border-accented bg-muted/30 px-4 py-3 sm:px-5"
    >
      <div class="min-w-0">
        <h2 v-if="title" class="text-xs font-medium text-highlighted">{{ title }}</h2>
        <p v-if="description" class="mt-1 text-xs leading-6 text-muted">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="shrink-0">
        <slot name="actions" />
      </div>
    </header>
    <div class="p-4 sm:p-5">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="border-t border-accented bg-muted/30 px-4 py-3 sm:px-5">
      <slot name="footer" />
    </footer>
  </section>
</template>
