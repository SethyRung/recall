<script setup lang="ts">
import { isSuccessResponse, type ApiResponse } from "#shared/types";
import type { DropdownMenuItem } from "@nuxt/ui";

type ChatSummary = { id: string; title: string | null; createdAt: Date };

const { data: session } = await useSession(useFetch);

const user = computed(() => session.value?.user);
const isSignedIn = computed(() => !!user.value && !user.value.isAnonymous);

const sidebarOpen = ref(false);
const searchOpen = ref(false);

const userMenuItems = computed<DropdownMenuItem[]>(
  () =>
    [
      isSignedIn.value && {
        label: "Log out",
        icon: "i-lucide-log-out",
        color: "error" as const,
        onSelect: async () => {
          await signOut();
          await navigateTo("/");
        },
      },
      !isSignedIn.value && {
        label: "Sign in",
        icon: "i-lucide-log-in",
        onSelect: () => navigateTo("/auth"),
      },
    ].filter(Boolean) as DropdownMenuItem[],
);

const { data: chatsEnvelope, refresh: refreshChats } = await useFetch<ApiResponse<ChatSummary[]>>(
  "/api/chats",
  {
    key: "chats",
  },
);

const chats = computed<UIChat[] | undefined>(() => {
  const env = chatsEnvelope.value;
  if (!env || !isSuccessResponse(env)) return undefined;
  return env.data.map((chat) => ({
    id: chat.id,
    label: chat.title || "Untitled",
    to: `/chat/${chat.id}`,
    icon: "i-lucide-message-circle",
    createdAt: new Date(chat.createdAt).toISOString(),
  }));
});

onNuxtReady(async () => {
  const first10 = (chats.value || []).slice(0, 10);
  for (const chat of first10) {
    try {
      await $fetch(`/api/chats/${chat.id}`);
    } catch {
      // silently skip chats that fail to prime
    }
  }
});

const { groups } = useChats(chats);

const items = computed(() =>
  groups.value?.flatMap((group) => [
    {
      label: group.label,
      type: "label" as const,
    },
    ...group.items.map((item) => ({
      ...item,
      slot: "chat" as const,
      icon: undefined,
      class: item.label === "Untitled" ? "text-muted" : "",
    })),
  ]),
);

const { renameChat, deleteChat } = useChatActions();

function getChatActions(item: { id: string; label: string }): DropdownMenuItem[][] {
  return [
    [
      {
        label: "Rename",
        icon: "i-lucide-pencil",
        onSelect: () => renameChat(item.id, item.label === "Untitled" ? "" : item.label),
      },
    ],
    [
      {
        label: "Delete",
        icon: "i-lucide-trash",
        color: "error" as const,
        onSelect: () => deleteChat(item.id),
      },
    ],
  ];
}

defineShortcuts({
  meta_o: () => {
    navigateTo("/chat");
  },
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="chat"
      v-model:open="sidebarOpen"
      :min-size="12"
      collapsible
      resizable
      :menu="{ inset: true }"
      class="border-r-0 py-4 dark:[--ui-bg-elevated:var(--ui-color-neutral-900)]"
    >
      <template #header="{ collapsed }">
        <NuxtLink v-if="!collapsed" to="/">
          <Logo />
        </NuxtLink>

        <UDashboardSidebarCollapse class="ms-auto" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="[
            {
              label: 'New chat',
              to: '/chat',
              kbds: ['meta', 'o'],
              icon: 'i-lucide-circle-plus',
            },
            {
              label: 'Home',
              to: '/',
              icon: 'i-lucide-home',
            },
          ]"
          :collapsed="collapsed"
          orientation="vertical"
        >
          <template #item-trailing="{ item }">
            <div
              v-if="item.kbds?.length"
              class="flex items-center gap-px opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <UKbd
                v-for="kbd in item.kbds"
                :key="kbd"
                :value="kbd"
                size="sm"
                variant="soft"
                class="bg-accented/50"
              />
            </div>
          </template>
        </UNavigationMenu>

        <UNavigationMenu
          v-if="!collapsed"
          :items="items"
          :collapsed="collapsed"
          orientation="vertical"
          :ui="{
            link: 'overflow-hidden pr-7.5',
            linkTrailing:
              'translate-x-full group-hover:translate-x-0 group-has-data-[state=open]:translate-x-0 transition-transform ms-0 absolute inset-e-px',
          }"
        >
          <template #chat-trailing="{ item }">
            <UDropdownMenu
              :items="getChatActions(item as { id: string; label: string })"
              :content="{ align: 'end' }"
            >
              <UButton
                as="div"
                icon="i-lucide-ellipsis"
                color="neutral"
                variant="link"
                size="sm"
                class="rounded-[5px] hover:bg-accented/50 focus-visible:bg-accented/50 data-[state=open]:bg-accented/50"
                aria-label="Chat actions"
                tabindex="-1"
                @click.stop.prevent
              />
            </UDropdownMenu>
          </template>
        </UNavigationMenu>
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="userMenuItems"
          :content="{ align: 'center' }"
          :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
        >
          <UButton
            v-bind="{
              label: collapsed ? undefined : isSignedIn ? user?.name : 'Anonymous session',
              trailingIcon: collapsed ? undefined : 'i-lucide:chevrons-up-down',
            }"
            :avatar="isSignedIn ? { alt: user?.name } : undefined"
            :icon="isSignedIn ? undefined : 'i-lucide-user-round'"
            color="neutral"
            variant="ghost"
            :square="collapsed"
            block
            class="data-[state=open]:bg-elevated"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch
      v-model:open="searchOpen"
      placeholder="Search chats..."
      :groups="[
        {
          id: 'links',
          items: [
            {
              label: 'New chat',
              to: '/chat',
              icon: 'i-lucide-circle-plus',
              kbds: ['meta', 'o'],
            },
          ],
        },
        ...groups,
      ]"
    />

    <div
      class="flex-1 flex m-4 lg:ml-0 rounded-lg ring ring-default bg-default/75 shadow min-w-0 overflow-hidden"
    >
      <slot />
    </div>
  </UDashboardGroup>
</template>
