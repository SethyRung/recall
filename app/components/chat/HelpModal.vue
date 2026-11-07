<script setup lang="ts">
const open = defineModel<boolean>("open", { required: true });
</script>

<template>
  <UModal
    v-model:open="open"
    title="recall --help"
    description="A few keys. Endless rabbit holes."
    :ui="{ content: 'rounded-none', header: 'border-b border-accented' }"
  >
    <template #body>
      <div class="text-xs leading-loose text-muted">
        <p>
          Ask about Sethy in plain language. Recall searches his notes and includes the sources it
          uses. Your session history is linked to this browser. No account needed.
        </p>
        <p class="mt-3">
          Drag session tabs to reorder them. On touchscreens, press and hold a tab first.
        </p>
        <p class="text-primary mt-6 mb-3">COMMANDS</p>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 [&_dt]:text-highlighted">
          <dt>/help</dt>
          <dd>Open this guide</dd>
          <dt>/new</dt>
          <dd>Start a new session</dd>
          <dt>/theme</dt>
          <dd>Choose a color scheme</dd>
        </dl>
        <p class="text-primary mt-6 mb-3">KEYBOARD</p>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 [&_dt]:text-highlighted">
          <dt>/</dt>
          <dd>Focus the prompt</dd>
          <dt>Enter</dt>
          <dd>Send your question</dd>
          <dt>Shift + Enter</dt>
          <dd>Add a new line</dd>
          <dt>⌘ / Ctrl + K</dt>
          <dd>Find a session</dd>
          <dt>⌘ / Ctrl + O</dt>
          <dd>New session</dd>
          <dt>Alt + Shift + ←/→</dt>
          <dd>Move focused tab</dd>
          <dt>?</dt>
          <dd>Open this guide</dd>
        </dl>
      </div>
    </template>
  </UModal>
</template>
