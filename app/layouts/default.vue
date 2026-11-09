<script setup lang="ts">
import { isSuccessResponse, type ApiResponse } from "#shared/types";
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";
import { createWelcomeTab } from "~/utils/chat-tabs";

type ChatSummary = { id: string; title: string | null; createdAt: Date };

const route = useRoute();
const { user, loggedIn: isSignedIn, signOut } = useUserSession();
const { theme, helpOpen, themeOpen } = useTerminal();
const colorMode = useColorMode();
const { tabs: openTabs, ensureCurrentTab, newTab, restore: restoreTabs } = useChatTabs();
const tabsStorageKey = computed(() => `recall:tabs:${user.value?.id ?? "visitor"}`);
let tabsRestored = false;

watch(() => route.fullPath, ensureCurrentTab, { immediate: true });

function saveTabs() {
  if (!tabsRestored) return;
  try {
    sessionStorage.setItem(tabsStorageKey.value, JSON.stringify(openTabs.value));
  } catch {}
}

function loadTabs() {
  tabsRestored = false;
  let saved: unknown;
  try {
    saved = JSON.parse(sessionStorage.getItem(tabsStorageKey.value) ?? "null");
  } catch {}
  restoreTabs(saved);
  tabsRestored = true;
  saveTabs();
}

onMounted(loadTabs);
watch(
  tabsStorageKey,
  async () => {
    if (!tabsRestored) return;
    tabsRestored = false;
    openTabs.value = [createWelcomeTab()];
    await navigateTo("/");
    loadTabs();
  },
  { flush: "sync" },
);
watch(openTabs, saveTabs, { deep: true, flush: "sync" });
const sidebarOpen = ref(true);
const searchOpen = ref(false);

const navigationItems = computed<NavigationMenuItem[]>(() => [
  {
    label: "Overview",
    icon: "i-lucide-house",
    to: "/",
    active: route.path === "/",
    onSelect: closeSidebar,
  },
  {
    label: "New session",
    icon: "i-lucide-square-terminal",
    active: route.path === "/chat",

    onSelect: () => {
      closeSidebar();
      newTab();
    },
  },
  {
    label: "Find a session",
    icon: "i-lucide-search",

    onSelect: () => {
      closeSidebar();
      searchOpen.value = true;
    },
  },
]);

const sidebarToggle = useTemplateRef("sidebarToggle");
const desktop = useMediaQuery("(min-width: 768px)");
const topics = [
  { label: "about.md", prompt: "Tell me about Sethy." },
  { label: "projects/", prompt: "What is Sethy working on?" },
  { label: "toolbox.md", prompt: "Tell me about Sethy's stack." },
];

watch(
  theme,
  ({ mode }) => {
    colorMode.preference = mode;
  },
  { immediate: true },
);

useHead({ htmlAttrs: { "data-terminal-theme": () => theme.value.id } });

const {
  data: chatsEnvelope,
  status: chatsStatus,
  refresh: refreshChats,
} = await useFetch<ApiResponse<ChatSummary[]>>("/api/chats");

const chats = computed(() => {
  const env = chatsEnvelope.value;
  if (!env || !isSuccessResponse(env)) return [];
  return env.data.map((chat) => ({
    id: chat.id,
    label: chat.title || "Untitled session",
    to: `/chat/${chat.id}`,
    icon: "i-lucide-terminal",
    createdAt: new Date(chat.createdAt).toISOString(),
  }));
});
const historyFailed = computed(
  () =>
    chatsStatus.value === "error" ||
    (chatsEnvelope.value && !isSuccessResponse(chatsEnvelope.value)),
);
const { groups } = useChats(chats);
const { renameChat, deleteChat } = useChatActions();

const userMenuItems = computed<DropdownMenuItem[]>(() => [
  ...(user.value?.role === "admin"
    ? [{ label: "Admin", icon: "i-lucide-settings", to: "/admin" }]
    : []),
  isSignedIn.value
    ? {
        label: "Sign out",
        icon: "i-lucide-log-out",
        onSelect: async () => {
          await signOut();
        },
      }
    : { label: "Sign in", icon: "i-lucide-log-in", to: "/auth" },
]);

function getChatActions(chat: { id: string; label: string }): DropdownMenuItem[] {
  return [
    { label: "Rename", icon: "i-lucide-pencil", onSelect: () => renameChat(chat.id, chat.label) },
    {
      label: "Delete",
      icon: "i-lucide-trash",
      color: "error",
      onSelect: () => deleteChat(chat.id),
    },
  ];
}

function closeSidebar() {
  if (!desktop.value) sidebarOpen.value = false;
}

function restoreSidebarFocus(event: Event) {
  event.preventDefault();
  if (!themeOpen.value && !helpOpen.value && !searchOpen.value) {
    sidebarToggle.value?.$el?.focus();
  }
}

watch(() => route.fullPath, closeSidebar);

defineShortcuts(
  computed(() => ({
    meta_o: { usingInput: true, handler: () => newTab() },
    meta_k: {
      usingInput: true,
      handler: () => {
        closeSidebar();
        searchOpen.value = true;
      },
    },
    "?": () => {
      closeSidebar();
      helpOpen.value = !helpOpen.value;
    },
  })),
);
</script>

<template>
  <div
    class="flex h-dvh flex-col bg-default text-sm leading-relaxed selection:bg-primary selection:text-inverted md:px-7 md:pt-6 md:pb-3.5"
  >
    <div class="flex min-h-0 flex-1 flex-col bg-default md:border md:border-accented md:shadow-xl">
      <header
        class="flex h-14 shrink-0 items-center border-b border-accented bg-muted/50 pr-4 md:pr-5"
      >
        <NuxtLink
          to="/"
          class="shrink-0 pl-5 text-base text-highlighted md:w-52 md:pl-6 md:text-lg lg:w-60"
        >
          <Logo />
        </NuxtLink>

        <div class="ml-auto flex items-center gap-3 md:gap-4">
          <UButton
            icon="i-lucide-circle-help"
            variant="ghost"
            class="text-muted hover:bg-elevated hover:text-primary"
            @click="helpOpen = true"
          />
        </div>
      </header>

      <div class="relative flex min-h-0 flex-1">
        <USidebar
          v-model:open="sidebarOpen"
          id="terminal-sidebar"
          title="Explorer"
          collapsible="icon"
          rail
          breakpoint="md"
          mode="slideover"
          class="h-full shrink-0"
          :menu="{
            content: { onCloseAutoFocus: restoreSidebarFocus },
            ui: {
              content: 'w-64 max-w-full divide-y-0 rounded-none ring-accented',
              overlay: 'bg-default/80',
            },
          }"
          :ui="{
            gap: 'w-52 lg:w-60',
            container: 'absolute h-full w-52 border-accented lg:w-60',
            inner: 'divide-y-0 bg-muted/50',
            header: 'h-10',
            title: 'text-xs font-normal tracking-widest text-muted uppercase',
            body: 'gap-0 p-0',
            footer: 'block p-0',
          }"
        >
          <template #title="{ state }">
            <span v-if="state === 'expanded'">Explorer</span>
            <UButton
              v-else
              icon="i-lucide-panel-left"
              color="neutral"
              variant="ghost"
              square
              @click="sidebarOpen = !sidebarOpen"
            />
          </template>

          <UNavigationMenu
            :items="navigationItems"
            :collapsed="!sidebarOpen"
            tooltip
            orientation="vertical"
            color="neutral"
            class="px-2.5 pt-2 pb-6"
            :ui="{
              link: 'min-h-9 gap-2.5 border-l-2 border-l-transparent text-left text-xs font-normal before:inset-0 before:rounded-none data-active:border-l-primary group-data-[state=collapsed]/sidebar:justify-center',
              linkLeadingIcon: 'size-4 text-inherit',
            }"
          >
            <template #item-trailing="{ item }">
              <span class="text-xs text-dimmed">{{ item.shortcut }}</span>
            </template>
          </UNavigationMenu>

          <div
            v-show="sidebarOpen"
            class="flex items-center gap-2 px-6 text-xs text-toned border-t border-accented pt-5"
          >
            <UIcon name="i-lucide-history" class="size-3.5" />
            <span>Sessions</span>
            <span class="ml-auto text-xs text-dimmed">{{ chats.length }}</span>
          </div>
          <div v-show="sidebarOpen" class="min-h-16 flex-1 overflow-y-auto px-2.5 py-4">
            <div
              v-if="historyFailed"
              class="px-3 py-1 text-xs text-muted [&_p]:mt-2.5 [&_p]:leading-loose"
            >
              <p>History unavailable.</p>
              <UButton
                color="neutral"
                variant="ghost"
                class="mt-2 p-0 text-xs text-primary hover:bg-transparent"
                @click="refreshChats()"
              >
                Try again ↗
              </UButton>
            </div>
            <div
              v-else-if="!chats.length"
              class="px-3 py-1 text-xs text-muted [&_p]:mt-2.5 [&_p]:leading-loose"
            >
              <span class="text-dimmed">[ no sessions yet ]</span>
              <p>
                Your next rabbit hole
                <br />
                starts with a question.
              </p>
            </div>
            <div v-for="group in groups" :key="group.id" class="not-first:mt-3">
              <p class="px-3 py-1.5 text-xs font-semibold text-muted">{{ group.label }}</p>
              <div
                v-for="chat in group.items"
                :key="chat.id"
                class="group/session relative flex items-center pr-1 hover:bg-elevated"
                :data-active="route.params.id === chat.id"
                :class="{ 'bg-elevated': route.params.id === chat.id }"
              >
                <NuxtLink
                  :to="`/chat/${chat.id}`"
                  class="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-xs text-muted group-data-[active=true]/session:text-primary"
                >
                  <UIcon :name="chat.icon" class="size-4 shrink-0 text-dimmed" />
                  <span class="truncate">{{ chat.label }}</span>
                </NuxtLink>
                <UDropdownMenu :items="getChatActions(chat)" :content="{ align: 'start' }">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    class="inline-flex size-7 shrink-0 items-center justify-center p-0 text-muted hover:bg-elevated hover:text-primary md:opacity-0 md:group-hover/session:opacity-100 md:group-focus-within/session:opacity-100"
                  >
                    <UIcon name="i-lucide-ellipsis" class="size-4" />
                  </UButton>
                </UDropdownMenu>
              </div>
            </div>
          </div>

          <template #footer>
            <UDropdownMenu
              :items="userMenuItems"
              :content="{ align: 'start' }"
              :ui="{ content: sidebarOpen ? 'w-(--reka-dropdown-menu-trigger-width)' : 'w-48' }"
            >
              <UButton
                color="neutral"
                variant="ghost"
                :title="isSignedIn ? user?.name : 'visitor'"
                class="w-full gap-2.5 border-t border-accented py-4 text-left font-normal hover:bg-elevated"
                :class="sidebarOpen ? 'px-5' : 'justify-center px-2'"
              >
                <span
                  class="grid size-7 shrink-0 place-items-center border border-accented text-base text-primary"
                >
                  {{ isSignedIn ? user?.name?.slice(0, 1).toLowerCase() : "~" }}
                </span>
                <span v-if="sidebarOpen" class="grid text-xs">
                  <span>{{ isSignedIn ? user?.name : "visitor" }}</span>
                  <span class="text-muted">
                    {{ isSignedIn ? "signed in" : "no account needed" }}
                  </span>
                </span>
                <UIcon
                  v-if="sidebarOpen"
                  name="i-lucide-chevrons-up-down"
                  class="size-3.5 text-muted ml-auto"
                />
              </UButton>
            </UDropdownMenu>
          </template>
        </USidebar>

        <main
          id="terminal-main"
          class="flex min-h-0 min-w-0 flex-1 flex-col outline-none"
          tabindex="-1"
        >
          <div class="flex h-11 shrink-0 items-stretch border-b border-accented bg-muted/50">
            <UButton
              color="neutral"
              variant="ghost"
              ref="sidebarToggle"
              class="mx-2 flex size-7 items-center justify-center self-center p-0 text-muted hover:bg-elevated hover:text-primary md:hidden"
              @click="sidebarOpen = !sidebarOpen"
            >
              <UIcon name="i-lucide-panel-left" class="size-4" />
            </UButton>
            <ChatTabs :chats="chats" />
            <span class="mr-6 ml-auto hidden shrink-0 self-center text-xs text-dimmed lg:block">
              ask. explore. recall.
            </span>
          </div>
          <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <slot />
          </div>
        </main>
      </div>

      <footer
        class="flex shrink-0 items-stretch justify-between gap-3 border-t border-accented bg-muted/50 text-xs"
      >
        <div class="flex items-center">
          <span
            class="flex items-center bg-primary px-3 py-0.5 text-xs font-semibold tracking-wide text-inverted md:px-5"
          >
            {{ route.params.id ? "SESSION" : "READY" }}
          </span>
          <span class="flex items-center gap-2 px-2.5 text-xs text-muted md:px-4">
            <span class="inline-block size-1.5 shrink-0 bg-primary" />
            sethy's knowledge
          </span>
        </div>
        <div class="px-3 flex gap-3 items-center text-muted">
          <span class="hidden sm:inline">notes → answers</span>
          <USeparator orientation="vertical" :ui="{ root: 'h-full', border: 'border-accented' }" />
          <span class="text-dimmed">UTF-8</span>
        </div>
      </footer>
    </div>

    <ChatThemePicker />

    <UDashboardSearch
      v-model:open="searchOpen"
      :color-mode="false"
      placeholder="Find a session..."
      :groups="[
        {
          id: 'links',
          label: 'Workspace',
          items: [{ label: 'New session', onSelect: () => newTab(), icon: 'i-lucide-plus' }],
        },
        ...groups,
      ]"
    />

    <ChatHelpModal v-model:open="helpOpen" />
  </div>
</template>
