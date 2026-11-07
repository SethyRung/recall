<script setup lang="ts">
defineProps<{ id: string; title: string; description: string }>();
</script>

<template>
  <UDashboardPanel :id="id" :ui="{ root: 'min-h-0', body: 'gap-0 p-0 sm:p-0' }">
    <template #body>
      <div class="mx-auto w-full max-w-6xl space-y-5 px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="font-pixel text-2xl leading-tight text-highlighted sm:text-3xl">
              {{ title }}
            </h1>
            <p class="mt-3 max-w-xl text-xs leading-6 text-muted">{{ description }}</p>
          </div>
          <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
            <slot name="actions" />
          </div>
        </div>
        <div
          v-if="$slots.status || $slots.toolbar"
          class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border border-accented bg-default px-4 py-3"
        >
          <div class="flex flex-wrap items-center gap-3 text-xs text-muted">
            <slot name="status" />
          </div>
          <div v-if="$slots.toolbar" class="flex items-center gap-2">
            <slot name="toolbar" />
          </div>
        </div>
        <slot />
      </div>
    </template>
  </UDashboardPanel>
</template>
