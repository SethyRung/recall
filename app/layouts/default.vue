<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";

const { data: session } = await useSession(useFetch);

const user = computed(() => session.value?.user);

const isSignedIn = computed(() => !!user.value && !user.value.isAnonymous);

const navItems = computed<NavigationMenuItem[]>(
  () =>
    [
      {
        icon: "i-lucide:home",
        label: "Home",
        to: "/",
      },
      {
        icon: "i-lucide:message-circle-more",
        label: "Chat",
        to: "/chat",
      },
      user.value?.role === "admin" && {
        icon: "i-lucide:ghost",
        label: "Admin",
        to: "/admin",
      },
    ].filter(Boolean) as NavigationMenuItem[],
);

const userMenuItems = computed<DropdownMenuItem[]>(() => [
  {
    type: "label",
    label: user.value?.name ?? "Account",
  },
  {
    type: "label",
    label: user.value?.email ?? "",
    class: "text-toned text-xs",
  },
  { type: "separator" },
  {
    label: "Sign out",
    icon: "i-lucide-log-out",
    color: "error",
    onSelect: async () => {
      await signOut();
      await navigateTo("/");
    },
  },
]);
</script>

<template>
  <div>
    <UHeader>
      <template #title>
        <Logo />
      </template>

      <UNavigationMenu :items="navItems" />

      <template #right>
        <UColorModeButton />

        <UDropdownMenu v-if="isSignedIn" :items="userMenuItems">
          <UButton
            :label="user?.name ?? 'Account'"
            icon="i-lucide-user-round"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>

        <UButton
          v-else
          to="/auth"
          label="Sign in"
          icon="i-lucide-log-in"
          color="neutral"
          variant="ghost"
        />
      </template>

      <template #body>
        <UNavigationMenu
          :items="navItems"
          orientation="vertical"
          :ui="{
            link: 'font-mono  py-2.5',
          }"
        />
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <UFooter>
      <template #left>
        <NuxtLink to="/">
          <Logo />
        </NuxtLink>

        <span class="text-xs text-muted ml-2">A RAG chatbot built on Nuxt.</span>
      </template>
      <template #right>
        <p class="text-xs text-toned">
          © {{ new Date().getFullYear() }} Sethy. All rights reserved.
        </p>
      </template>
    </UFooter>
  </div>
</template>
