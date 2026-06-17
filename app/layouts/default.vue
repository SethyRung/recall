<script setup lang="ts">
const sidebarOpen = ref(false);
const searchOpen = ref(false);

const items = computed(() => []);

defineShortcuts({
  meta_o: () => {
    navigateTo("/");
  },
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="sidebarOpen"
      :min-size="12"
      collapsible
      resizable
      :menu="{ inset: true }"
      class="border-r-0 py-4 dark:[--ui-bg-elevated:var(--ui-color-neutral-900)]"
    >
      <template #header="{ collapsed }">
        <NuxtLink v-if="!collapsed" to="/" class="flex items-end gap-0.5">
          <Logo class="h-8 w-auto shrink-0" />
          <span class="text-xl font-bold text-highlighted">Chat</span>
        </NuxtLink>

        <UDashboardSidebarCollapse class="ms-auto" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="[
            {
              label: 'New chat',
              to: '/',
              kbds: ['meta', 'o'],
              icon: 'i-lucide-circle-plus',
            },
            {
              label: 'Search',
              icon: 'i-lucide-search',
              kbds: ['meta', 'k'],
              onSelect: () => {
                searchOpen = true;
              },
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
        />
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
              to: '/',
              icon: 'i-lucide-circle-plus',
              kbds: ['meta', 'o'],
            },
          ],
        },
      ]"
    />

    <div
      class="flex-1 flex m-4 lg:ml-0 rounded-lg ring ring-default bg-default/75 shadow min-w-0 overflow-hidden"
    >
      <slot />
    </div>
  </UDashboardGroup>
</template>
