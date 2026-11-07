<script setup lang="ts">
defineProps<{ commands: readonly { name: string; description: string }[] }>();
const selected = defineModel<number>("selected", { default: 0 });
const emit = defineEmits<{ select: [name: string] }>();
</script>

<template>
  <div class="bg-muted/50">
    <div
      class="flex flex-wrap gap-x-4 gap-y-1 border-b border-accented px-4 py-3 text-xs text-dimmed"
    >
      <span>↑↓ navigate</span>
      <span>enter select</span>
      <span>esc close</span>
    </div>
    <ul class="space-y-1 p-2">
      <li v-for="(command, index) in commands" :key="command.name">
        <button
          type="button"
          tabindex="-1"
          :data-active="index === selected || undefined"
          class="flex w-full items-start gap-3 px-2 py-2 text-left text-sm hover:bg-elevated sm:items-center"
          :class="index === selected ? 'bg-primary/10 text-primary' : 'text-default'"
          @pointermove="selected = index"
          @mousedown.prevent
          @click="emit('select', command.name)"
        >
          <span class="w-3 shrink-0" :class="{ 'opacity-0': index !== selected }">❯</span>
          <span class="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
            <span class="block shrink-0 sm:w-24">/{{ command.name }}</span>
            <span class="block text-xs text-muted sm:text-sm">{{ command.description }}</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
