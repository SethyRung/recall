<script setup lang="ts">
import { getChatTabLocation } from "~/utils/chat-tabs";
import { useSortable } from "@vueuse/integrations/useSortable";

const props = defineProps<{ chats: Array<{ id: string; label: string }> }>();
const { tabs, activeId, newTab, closeTab, reorderTabs, moveTab } = useChatTabs();
const list = useTemplateRef("list");
const dragging = ref(false);
const draggedId = ref<string>();
const announcement = ref("");
const reducedMotion = usePreferredReducedMotion();
const items = computed(() =>
  tabs.value.map((tab) => ({
    ...tab,
    label:
      tab.id === "welcome"
        ? "welcome"
        : tab.chatId
          ? (props.chats.find((chat) => chat.id === tab.chatId)?.label ?? "Untitled session")
          : tab.draft.trim().split("\n")[0] || "New session",
  })),
);

function announcePosition(id: string) {
  const index = items.value.findIndex((tab) => tab.id === id);
  const tab = items.value[index];
  if (tab) announcement.value = `${tab.label} moved to tab ${index + 1} of ${items.value.length}.`;
}

const sortableTabs = computed({
  get: () => tabs.value,
  set: (order) => {
    reorderTabs(order.map((tab) => tab.id));
    if (draggedId.value) announcePosition(draggedId.value);
  },
});

const { option } = useSortable(list, sortableTabs, {
  direction: "horizontal",
  draggable: "[data-tab-id]",
  filter: "[data-tab-close]",
  preventOnFilter: false,
  animation: reducedMotion.value === "reduce" ? 0 : 150,
  delay: 220,
  delayOnTouchOnly: true,
  touchStartThreshold: 5,
  fallbackTolerance: 5,
  forceFallback: true,
  fallbackOnBody: true,
  ghostClass: "opacity-30",
  chosenClass: "cursor-grabbing",
  fallbackClass: "bg-elevated",
  onStart: (event) => {
    dragging.value = true;
    draggedId.value = event.item.dataset.tabId;
  },
  onEnd: () => {
    dragging.value = false;
  },
});

watch(reducedMotion, (value) => option("animation", value === "reduce" ? 0 : 150));

async function scrollActive() {
  if (dragging.value) return;
  await nextTick();
  list.value
    ?.querySelector<HTMLElement>(`[data-tab-id="${activeId.value}"]`)
    ?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

watch(
  [
    activeId,
    () => tabs.value.length,
    () => items.value.find((tab) => tab.id === activeId.value)?.label,
  ],
  scrollActive,
  { flush: "post" },
);
useResizeObserver(list, scrollActive);

async function move(id: string, direction: -1 | 1) {
  if (!moveTab(id, direction)) return;
  announcePosition(id);
  await nextTick();
  const link = list.value?.querySelector<HTMLElement>(`[data-tab-id="${id}"] a`);
  link?.focus({ preventScroll: true });
  link?.parentElement?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

async function close(id: string) {
  await closeTab(id);
  await nextTick();
  list.value?.querySelector<HTMLElement>(`[data-tab-id="${activeId.value}"] a`)?.focus();
}
</script>

<template>
  <div class="flex min-w-0 flex-1 items-stretch">
    <span id="tab-reorder-help" class="sr-only">
      Drag tabs to reorder. On touch, press and hold. With a tab focused, use Alt + Shift + Left or
      Right arrow.
    </span>
    <span role="status" class="sr-only">{{ announcement }}</span>
    <nav ref="list" class="no-scrollbar -my-px flex min-w-0 items-stretch overflow-x-auto">
      <div
        v-for="tab in items"
        :key="tab.id"
        :data-tab-id="tab.id"
        class="flex shrink-0 select-none items-center border-t border-r border-r-accented"
        :class="tab.id === activeId ? 'border-t-primary bg-default' : 'border-t-transparent'"
      >
        <UButton
          :to="getChatTabLocation(tab)"
          :active="tab.id === activeId"
          :title="tab.label"
          :draggable="false"
          color="neutral"
          variant="ghost"
          class="h-full min-w-0 cursor-grab gap-3 rounded-none px-3.5 py-0 text-xs font-normal hover:bg-transparent active:bg-transparent md:px-4"
          :class="tab.id === activeId ? 'text-toned' : 'text-muted'"
          @keydown.alt.shift.left.prevent="move(tab.id, -1)"
          @keydown.alt.shift.right.prevent="move(tab.id, 1)"
        >
          <UIcon
            :name="tab.id === 'welcome' ? 'i-lucide-house' : 'i-lucide-terminal'"
            class="size-4 shrink-0 text-primary"
          />
          <span class="max-w-32 truncate md:max-w-44">{{ tab.label }}</span>
        </UButton>
        <UButton
          data-tab-close
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          class="mr-2 size-5 shrink-0 justify-center rounded-none p-0 text-dimmed hover:bg-transparent active:bg-transparent"
          :ui="{ leadingIcon: 'size-3.5' }"
          @click="close(tab.id)"
        />
      </div>
    </nav>
    <UButton
      icon="i-lucide-plus"
      color="neutral"
      variant="ghost"
      class="w-10 shrink-0 justify-center rounded-none px-0 text-dimmed hover:bg-elevated hover:text-primary"
      :ui="{ leadingIcon: 'size-4' }"
      @click="newTab()"
    />
  </div>
</template>
