<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { data: session } = await useSession(useFetch);

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
      session.value?.user.role === "admin" && {
        icon: "i-lucide:ghost",
        label: "Admin",
        to: "/admin",
      },
    ].filter(Boolean) as NavigationMenuItem[],
);
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
        <UButton
          label="Start chatting"
          trailing-icon="i-lucide-arrow-up-right"
          to="/chat"
          class="hidden lg:inline-flex"
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
