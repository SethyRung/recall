<script setup lang="ts">
const { user, signOut } = useUserSession();

async function onSignOut() {
  await signOut();
}
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar :min-size="12" collapsible resizable :menu="{ inset: true }">
      <template #header="{ collapsed }">
        <NuxtLink v-if="!collapsed" to="/" class="flex items-center gap-2">
          <UIcon name="i-lucide-sparkles" class="size-5 text-primary" />
          <span class="font-semibold tracking-tight">Recall</span>
        </NuxtLink>

        <UDashboardSidebarCollapse class="ms-auto" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="[
            {
              icon: 'i-lucide:layout-dashboard',
              label: 'Knowledge base',
              to: '/admin',
            },
            { icon: 'i-lucide-settings', label: 'Settings', to: '/admin/settings' },
          ]"
          :collapsed="collapsed"
          orientation="vertical"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="[
            {
              label: 'Log out',
              icon: 'i-lucide-log-out',
              onSelect: onSignOut,
            },
          ]"
          :content="{ align: 'center' }"
          :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
        >
          <UButton
            v-bind="{
              label: collapsed ? undefined : user?.name,
              trailingIcon: collapsed ? undefined : 'i-lucide:chevrons-up-down',
            }"
            :avatar="{
              alt: user?.name,
            }"
            color="neutral"
            variant="ghost"
            block
            class="data-[state=open]:bg-elevated"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
