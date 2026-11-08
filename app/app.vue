<script setup lang="ts">
const { user } = useUserSession();
const sessionOwner = computed(() => user.value?.id ?? "visitor");

useHead({
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ],
  link: [
    { rel: "icon", type: "image/x-icon", sizes: "16x16 32x32 48x48", href: "/favicon.ico" },
    { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
  ],
  htmlAttrs: {
    lang: "en",
  },
});
</script>

<template>
  <UApp :toaster="{ position: 'top-right' }" class="font-sans">
    <NuxtLayout>
      <NuxtPage :key="sessionOwner" />
    </NuxtLayout>
  </UApp>
</template>
