<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{
  error: NuxtError;
}>();

useHead({
  title: `${props.error.status ?? 500} · ${props.error.statusText || "Something went wrong"} · Recall`,
});

const isNotFound = computed(() => props.error.status === 404);
const isAuthError = computed(() => props.error.status === 401 || props.error.status === 403);

const eyebrowIcon = computed(() => {
  if (isNotFound.value) return "i-lucide-search-x";
  if (isAuthError.value) return "i-lucide-lock";
  return "i-lucide-alert-triangle";
});

const eyebrowLabel = computed(() => {
  if (isNotFound.value) return `Error ${props.error.status}`;
  if (isAuthError.value) return `Error ${props.error.status}`;
  return `Error ${props.error.status ?? 500}`;
});

const heading = computed(() => {
  if (isNotFound.value)
    return {
      lead: "Lost the",
      accent: "thread",
      trail: ".",
    };
  if (isAuthError.value)
    return {
      lead: "Behind a",
      accent: "wall",
      trail: ".",
    };
  return {
    lead: "Hit a",
    accent: "snag",
    trail: ".",
  };
});

const message = computed(() => {
  if (props.error.message && !isNotFound.value && !isAuthError.value) {
    return props.error.message;
  }
  if (isNotFound.value) {
    return "The page you're after isn't here — but the notes are. Try asking Recall instead.";
  }
  if (isAuthError.value) {
    return "This area needs you to be signed in (or have the right role). Head back home and start a chat in the meantime.";
  }
  return "Recall hit an unexpected error on its way to answering. Try again, or head back home.";
});

function handleClear() {
  clearError({ redirect: "/" });
}
</script>

<template>
  <UApp>
    <div
      class="w-screen h-screen overflow-x-hidden overflow-y-auto flex items-center justify-center"
    >
      <UContainer>
        <div class="max-w-3xl mx-auto text-center space-y-6">
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-elevated text-toned text-xs font-medium tracking-wide uppercase"
          >
            <UIcon :name="eyebrowIcon" class="text-primary" />
            {{ eyebrowLabel }}
          </span>

          <h1 class="text-5xl sm:text-6xl lg:text-7xl font-semibold text-highlighted">
            {{ heading.lead }}
            <span class="font-pixel font-medium text-primary">{{ heading.accent }}</span
            >{{ heading.trail }}
          </h1>

          <p class="text-lg sm:text-xl text-muted leading-relaxed">
            {{ message }}
          </p>

          <div class="flex flex-wrap items-center justify-center gap-3 pt-2 font-mono">
            <UButton icon="i-lucide-home" label="Back to home" @click="handleClear" />
          </div>
        </div>
      </UContainer>
    </div>
  </UApp>
</template>
