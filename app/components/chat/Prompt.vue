<script setup lang="ts">
import type { ChatStatus } from "ai";

withDefaults(defineProps<{ status?: ChatStatus; error?: Error; starting?: boolean }>(), {
  status: "ready",
  starting: false,
});
const input = defineModel<string>({ default: "" });
const emit = defineEmits<{ submit: [event: Event]; stop: []; reload: [] }>();
const prompt = useTemplateRef("prompt");
const { commands, helpOpen, runCommand } = useTerminal();
const commandFocused = ref(false);
const commandsDismissed = ref(false);
const selectedCommand = ref(0);
let compositionEndedAt = 0;

const matchingCommands = computed(() => {
  const query = input.value.match(/^\/([a-z]*)$/i)?.[1]?.toLowerCase();
  return query === undefined ? [] : commands.filter((command) => command.name.startsWith(query));
});
const commandsOpen = computed(
  () => commandFocused.value && !commandsDismissed.value && matchingCommands.value.length > 0,
);

watch(
  input,
  () => {
    commandsDismissed.value = false;
    selectedCommand.value = 0;
  },
  { flush: "sync" },
);

function selectCommand(name: string) {
  if (runCommand(`/${name}`)) input.value = "";
}

function handleKeydown(event: KeyboardEvent) {
  if (
    !commandsOpen.value ||
    event.isComposing ||
    event.keyCode === 229 ||
    Date.now() - compositionEndedAt < 50 ||
    event.shiftKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  ) {
    return;
  }

  switch (event.key) {
    case "ArrowDown":
      selectedCommand.value = (selectedCommand.value + 1) % matchingCommands.value.length;
      break;
    case "ArrowUp":
      selectedCommand.value =
        (selectedCommand.value - 1 + matchingCommands.value.length) % matchingCommands.value.length;
      break;
    case "Enter":
      selectCommand(matchingCommands.value[selectedCommand.value]!.name);
      break;
    case "Escape":
      commandsDismissed.value = true;
      break;
    default:
      return;
  }

  event.preventDefault();
  event.stopPropagation();
}

function submit(event: Event) {
  if (!commandsDismissed.value && matchingCommands.value.length > 0) {
    selectCommand(matchingCommands.value[selectedCommand.value]!.name);
    return;
  }
  if (runCommand(input.value)) {
    input.value = "";
    return;
  }
  emit("submit", event);
}

function focus() {
  prompt.value?.textareaRef?.focus();
}

defineShortcuts({ "/": focus });
defineExpose({ focus });
</script>

<template>
  <UPopover
    :open="commandsOpen"
    :dismissible="false"
    :content="{
      side: 'top',
      sideFlip: false,
      align: 'start',
      onOpenAutoFocus: (event) => event.preventDefault(),
      onCloseAutoFocus: (event) => event.preventDefault(),
    }"
    :ui="{
      content:
        'w-(--reka-popover-trigger-width) max-h-(--reka-popover-content-available-height) overflow-y-auto rounded-none ring-accented',
    }"
  >
    <template #anchor>
      <div>
        <UChatPrompt
          ref="prompt"
          v-model="input"
          :status="status"
          :error="error"
          :autofocus="false"
          :maxrows="6"
          variant="outline"
          placeholder="Ask something about Sethy..."
          class="rounded-none bg-muted/50 ring-accented px-3.5 pt-3.5 pb-2.5 gap-1 backdrop-blur-none md:px-5 md:pt-4 md:pb-3"
          :ui="{
            header: 'mb-1.5 gap-3 text-xs',
            base: 'pl-6 py-2 text-base sm:text-sm leading-6',
            leading: 'ps-0 inset-y-2',
            footer: 'border-t border-accented pt-3 mt-2',
          }"
          @focus="commandFocused = true"
          @blur="commandFocused = false"
          @keydown.capture="handleKeydown"
          @compositionend="compositionEndedAt = Date.now()"
          @submit="submit"
        >
          <template #header>
            <span>
              <span class="text-primary">visitor</span>
              <span class="text-muted">@recall</span>
            </span>
            <span class="text-muted">~/sethy</span>
          </template>
          <template #leading>
            <span class="text-primary text-lg leading-6">❯</span>
          </template>
          <template #footer>
            <div class="flex w-full items-center justify-between gap-4" @mousedown.prevent>
              <div class="flex items-center gap-4 text-xs text-muted">
                <UButton
                  color="primary"
                  variant="link"
                  class="p-0 text-xs"
                  label="/help"
                  @click="helpOpen = true"
                />
                <span class="hidden sm:inline">
                  shift + enter
                  <span class="text-dimmed">newline</span>
                </span>
              </div>
              <UChatPromptSubmit
                :status="status"
                :loading="starting"
                :disabled="!input.trim() && status === 'ready'"
                icon="i-lucide-corner-down-left"
                color="primary"
                variant="soft"
                size="sm"
                class="rounded-none"
                @stop="emit('stop')"
                @reload="emit('reload')"
              />
            </div>
          </template>
        </UChatPrompt>
      </div>
    </template>
    <template #content>
      <ChatCommandMenu
        v-model:selected="selectedCommand"
        :commands="matchingCommands"
        @select="selectCommand"
      />
    </template>
  </UPopover>
</template>
