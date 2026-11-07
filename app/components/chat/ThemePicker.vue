<script setup lang="ts">
const { themes, theme, themeOpen, setTheme } = useTerminal();
const list = useTemplateRef("list");
const groups = [
  {
    id: "themes",
    items: themes.map((option) => ({
      id: option.id,
      label: option.label,
      onSelect: () => setTheme(option.id),
    })),
  },
];

function focusList(event: Event) {
  event.preventDefault();
  list.value?.querySelector<HTMLElement>('[role="listbox"]')?.focus();
}
</script>

<template>
  <UModal
    v-model:open="themeOpen"
    title="Color Scheme"
    description="Choose a color scheme for Recall."
    :content="{ onOpenAutoFocus: focusList }"
    :ui="{
      content: 'max-w-sm rounded-none',
      header: 'min-h-0 p-4 sm:px-4',
      title: 'text-sm',
      description: 'sr-only',
      body: 'p-2 sm:p-2',
      footer: 'justify-between px-4 py-3 sm:px-4 text-xs text-muted',
    }"
  >
    <template #body>
      <div ref="list">
        <UCommandPalette
          :input="false"
          :groups="groups"
          :model-value="theme.id"
          value-key="id"
          label-key="label"
          loop
          :ui="{
            content: 'outline-none',
            viewport: 'max-h-96',
            group: 'p-0',
            item: 'items-center gap-2 px-2 py-2 text-sm before:rounded-none data-highlighted:text-primary',
            itemLabel: 'text-inherit',
            itemTrailingIcon: 'hidden',
            itemTrailingHighlightedIcon: 'hidden',
          }"
        >
          <template #item-leading>
            <span class="w-3 shrink-0 opacity-0 group-data-highlighted:opacity-100">❯</span>
          </template>
          <template #item-label="{ item }">
            {{ item.label }}
            <span v-if="item.id === theme.id" class="text-muted">(current)</span>
          </template>
        </UCommandPalette>
      </div>
    </template>
    <template #footer>
      <span>↑↓ navigate</span>
      <span>enter select</span>
      <span>esc close</span>
    </template>
  </UModal>
</template>
