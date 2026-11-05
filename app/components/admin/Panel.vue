<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <section class="border border-accented">
    <header
      v-if="title || description || $slots.actions"
      class="flex items-start justify-between gap-3 border-b border-accented px-5 py-3"
    >
      <div class="min-w-0">
        <h2 v-if="title" class="font-semibold text-highlighted">{{ title }}</h2>
        <p v-if="description" class="mt-0.5 text-sm text-dimmed">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="shrink-0">
        <slot name="actions" />
      </div>
    </header>
    <div class="p-5">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="border-t border-accented px-5 py-3">
      <slot name="footer" />
    </footer>
  </section>
</template>
