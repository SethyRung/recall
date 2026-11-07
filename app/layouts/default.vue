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
const sidebarOpen = ref(false);
const searchOpen = ref(false);

const navigationItems = computed<NavigationMenuItem[]>(() => [
  {
    label: "Overview",
    icon: "i-lucide-house",
    to: "/",
    active: route.path === "/",
  },
  {
    label: "New session",
    icon: "i-lucide-square-terminal",
    active: route.path === "/chat",

    onSelect: () => newTab(),
  },
  {
    label: "Find a session",
    icon: "i-lucide-search",

    onSelect: () => {
      searchOpen.value = true;
    },
  },
]);

const sidebar = useTemplateRef("sidebar");
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
} = await useFetch<ApiResponse<ChatSummary[]>>("/api/chats", { key: "chats" });

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

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false;
  },
);

watch(desktop, (value) => {
  if (value) sidebarOpen.value = false;
});

watch(sidebarOpen, async (open) => {
  await nextTick();
  if (open) {
    sidebar.value?.querySelector("a")?.focus();
  } else if (sidebar.value?.contains(document.activeElement)) {
    sidebarToggle.value?.$el?.focus();
  }
});

defineShortcuts(
  computed(() => ({
    escape:
      sidebarOpen.value && !themeOpen.value && !helpOpen.value && !searchOpen.value
        ? () => {
            sidebarOpen.value = false;
          }
        : false,
    meta_o: { usingInput: true, handler: () => newTab() },
    meta_k: {
      usingInput: true,
      handler: () => {
        searchOpen.value = true;
      },
    },
    "?": () => {
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
        <UButton
          color="neutral"
          variant="ghost"
          v-if="sidebarOpen"
          class="absolute inset-0 z-20 rounded-none bg-default/80 p-0 hover:bg-default/80 md:hidden"
          @click="sidebarOpen = false"
        />
        <aside
          ref="sidebar"
          id="terminal-sidebar"
          class="absolute inset-y-0 left-0 z-30 w-64 max-w-full shrink-0 flex-col overflow-y-auto border-r border-accented bg-default md:bg-muted/50 md:static md:z-auto md:flex md:w-52 md:max-w-none lg:w-60"
          :class="sidebarOpen ? 'flex' : 'hidden'"
        >
          <div
            class="flex h-11 shrink-0 items-center justify-between px-5 text-xs tracking-widest text-muted"
          >
            <span>EXPLORER</span>
          </div>

          <UNavigationMenu
            :items="navigationItems"
            orientation="vertical"
            color="neutral"
            class="px-2.5 pt-2 pb-6"
            :ui="{
              link: 'min-h-9 gap-2.5 border-l-2 border-l-transparent text-left text-xs font-normal before:inset-0 before:rounded-none data-active:border-l-primary',
              linkLeadingIcon: 'size-4 text-inherit',
            }"
          >
            <template #item-trailing="{ item }">
              <span class="text-xs text-dimmed">{{ item.shortcut }}</span>
            </template>
          </UNavigationMenu>

          <div
            class="flex items-center gap-2 px-6 text-xs text-toned border-t border-accented pt-5"
          >
            <UIcon name="i-lucide-history" class="size-3.5" />
            <span>Sessions</span>
            <span class="ml-auto text-xs text-dimmed">{{ chats.length }}</span>
          </div>
          <div class="min-h-16 flex-1 overflow-y-auto px-2.5 py-4">
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
              <p class="px-3 py-1.5 text-xs text-dimmed">{{ group.label }}</p>
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
                  <span class="text-dimmed">›</span>
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

          <UDropdownMenu
            :items="userMenuItems"
            :content="{ align: 'start' }"
            :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width)' }"
          >
            <UButton
              color="neutral"
              variant="ghost"
              class="w-full gap-2.5 border-t border-accented px-5 py-4 text-left font-normal hover:bg-elevated"
            >
              <span
                class="grid size-7 shrink-0 place-items-center border border-accented text-base text-primary"
              >
                {{ isSignedIn ? user?.name?.slice(0, 1).toLowerCase() : "~" }}
              </span>
              <span class="grid text-xs">
                <span>{{ isSignedIn ? user?.name : "visitor" }}</span>
                <span class="text-muted">{{ isSignedIn ? "signed in" : "no account needed" }}</span>
              </span>
              <UIcon name="i-lucide-chevrons-up-down" class="size-3.5 text-muted ml-auto" />
            </UButton>
          </UDropdownMenu>
        </aside>

        <main
          id="terminal-main"
          class="flex min-h-0 min-w-0 flex-1 flex-col outline-none"
          tabindex="-1"
          :inert="sidebarOpen"
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
