<script setup lang="ts">
const route = useRoute();
const { user, signOut } = useUserSession();
const { theme, themeOpen } = useTerminal();
const colorMode = useColorMode();
const settingsPage = computed(() => route.path === "/admin/settings");
const navigation = [
  { label: "knowledge-base/", to: "/admin", icon: "i-lucide-database" },
  { label: "settings.toml", to: "/admin/settings", icon: "i-lucide-settings" },
];
const sections = computed(() =>
  settingsPage.value
    ? [
        { label: "models", value: "models" },
        { label: "knowledge", value: "knowledge" },
        { label: "chat", value: "chat" },
        { label: "integrations", value: "integrations" },
      ]
    : [
        { label: "overview", value: "overview" },
        { label: "sources", value: "sources" },
        { label: "test retrieval", value: "retrieval" },
        { label: "maintenance", value: "maintenance" },
      ],
);
const activeSection = computed(
  () =>
    sections.value.find((item) => item.value === route.query.section)?.value ??
    sections.value[0]?.value,
);

watch(
  theme,
  ({ mode }) => {
    colorMode.preference = mode;
  },
  { immediate: true },
);

useHead({ htmlAttrs: { "data-terminal-theme": () => theme.value.id } });

async function onSignOut() {
  await signOut();
}
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
          class="shrink-0 pl-5 text-base text-highlighted md:w-60 md:pl-6 md:text-lg"
        >
          <Logo />
        </NuxtLink>

        <div class="ml-auto">
          <NuxtLink
            to="/chat"
            class="flex items-center gap-2 text-xs text-muted hover:text-primary"
          >
            <span class="hidden sm:inline">back to chat</span>
            <UIcon name="i-lucide-arrow-up-right" class="size-4" />
          </NuxtLink>
        </div>
      </header>

      <UDashboardGroup unit="rem" class="relative inset-auto min-h-0 flex-1">
        <UDashboardSidebar
          id="admin"
          :min-size="12"
          :default-size="14.5"
          :collapsed-size="4"
          collapsible
          resizable
          :ui="{
            root: 'min-h-0 border-accented bg-muted/50',
            header: 'h-11 border-b border-accented px-5 text-xs tracking-widest text-muted',
            body: 'gap-0 p-0',
            footer: 'border-t border-accented p-0',
            content: 'rounded-none',
          }"
        >
          <template #header="{ collapsed }">
            <span v-if="!collapsed">EXPLORER</span>
            <UDashboardSidebarCollapse color="neutral" variant="ghost" size="xs" class="ms-auto" />
          </template>

          <template #default="{ collapsed }">
            <nav class="px-2.5 pt-2 pb-6">
              <UTooltip
                v-for="item in navigation"
                :key="item.to"
                :text="item.label"
                :disabled="!collapsed"
              >
                <UButton
                  :to="item.to"
                  :icon="item.icon"
                  :label="collapsed ? undefined : item.label"
                  :active="route.path === item.to"
                  color="neutral"
                  variant="ghost"
                  class="min-h-9 w-full justify-start gap-2.5 border-l-2 px-2.5 py-1.5 text-xs font-normal"
                  active-class="border-l-primary bg-elevated text-highlighted"
                  inactive-class="border-l-transparent text-muted"
                  :ui="{ leadingIcon: 'size-4' }"
                />
              </UTooltip>
            </nav>

            <template v-if="!collapsed">
              <div class="flex items-center gap-2 px-6 text-xs text-toned">
                <UIcon name="i-lucide-folder-open" class="size-3.5" />
                <span>{{ settingsPage ? "settings/" : "knowledge-base/" }}</span>
              </div>
              <nav class="grid gap-3 px-6 pt-4 pb-7 text-xs">
                <NuxtLink
                  v-for="(item, index) in sections"
                  :key="item.value"
                  :to="{
                    path: route.path,
                    query: { ...route.query, section: index ? item.value : undefined },
                    hash: route.hash,
                  }"
                  class="flex gap-3 hover:text-primary"
                  :class="activeSection === item.value ? 'text-primary' : 'text-muted'"
                >
                  <span class="text-dimmed">{{ index === sections.length - 1 ? "└─" : "├─" }}</span>
                  {{ item.label }}
                </NuxtLink>
              </nav>

              <div class="mx-6 border-t border-accented pt-5 text-xs text-muted">
                <p class="mb-3 tracking-widest">ACCESS</p>
                <p class="flex items-center gap-2">
                  <span class="inline-block size-1.5 bg-primary" />
                  admin workspace
                </p>
                <p class="mt-2 text-dimmed">Your notes. Your controls.</p>
              </div>
            </template>
          </template>

          <template #footer="{ collapsed }">
            <UDropdownMenu
              :items="[{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: onSignOut }]"
              :content="{ align: 'start' }"
              :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
            >
              <UButton
                color="neutral"
                variant="ghost"
                class="w-full gap-2.5 px-5 py-4 text-left font-normal hover:bg-elevated"
                :class="{ 'justify-center px-2': collapsed }"
              >
                <span
                  class="grid size-7 shrink-0 place-items-center border border-accented text-base text-primary"
                >
                  {{ user?.name?.slice(0, 1).toLowerCase() ?? "~" }}
                </span>
                <template v-if="!collapsed">
                  <span class="grid text-xs">
                    <span>{{ user?.name ?? "Admin" }}</span>
                    <span class="text-xs text-muted">administrator</span>
                  </span>
                  <UIcon name="i-lucide-chevrons-up-down" class="ml-auto size-3.5 text-muted" />
                </template>
              </UButton>
            </UDropdownMenu>
          </template>
        </UDashboardSidebar>

        <main id="admin-main" class="flex min-h-0 min-w-0 flex-1 outline-none" tabindex="-1">
          <slot />
        </main>
      </UDashboardGroup>

      <footer
        class="flex min-h-7 shrink-0 items-stretch justify-between border-t border-accented bg-muted/50 text-xs"
      >
        <div class="flex items-center">
          <span
            class="flex items-center bg-primary px-3 py-0.5 font-semibold text-inverted md:px-5"
          >
            ADMIN
          </span>
          <span class="flex items-center gap-2 px-3 text-muted">
            <UIcon name="i-lucide-lock-keyhole" class="size-3" />
            private workspace
          </span>
        </div>
        <div class="flex items-center gap-4 text-muted">
          <span class="hidden sm:inline">notes → knowledge</span>
          <span class="border-l border-accented px-3 text-dimmed md:px-4">UTF-8</span>
        </div>
      </footer>
    </div>
  </div>
</template>
