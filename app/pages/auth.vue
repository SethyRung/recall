<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

definePageMeta({ layout: "empty" });

const { redirect } = useAuthRedirect();

const { data: session } = await useSession(useFetch);

watch(
  session,
  (sess) => {
    if (sess?.user) {
      navigateTo(redirect.value || "/");
    }
  },
  { immediate: true },
);

const items: TabsItem[] = [
  {
    label: "Sign in",
    slot: "sign_in" as const,
  },
  {
    label: "Sign up",
    slot: "sign_up" as const,
  },
];
</script>

<template>
  <UContainer class="h-screen max-w-md">
    <div class="h-full flex items-center">
      <UTheme
        :props="{
          button: {
            color: 'neutral',
            ui: {
              base: 'rounded-none',
            },
          },
          checkbox: {
            color: 'neutral',
            ui: {
              base: 'rounded-none',
            },
          },
          input: {
            color: 'neutral',
            ui: {
              root: 'w-full',
              base: 'rounded-none',
            },
          },
        }"
      >
        <UTabs
          :items="items"
          :unmount-on-hide="false"
          color="neutral"
          :ui="{
            root: 'gap-0 items-start',
            list: 'w-max px-0 rounded-none',
            indicator: 'rounded-none',
          }"
        >
          <template #sign_in>
            <AuthLoginForm />
          </template>

          <template #sign_up>
            <AuthSignupForm />
          </template>
        </UTabs>
      </UTheme>
    </div>
  </UContainer>
</template>
