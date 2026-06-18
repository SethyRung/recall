<script setup lang="ts">
const input = ref("");
const loading = ref(false);

const greeting = computed(() => {
  const hour = new Date().getHours();
  let timeGreeting = "Good evening";
  if (hour < 12) timeGreeting = "Good morning";
  else if (hour < 18) timeGreeting = "Good afternoon";

  return timeGreeting;
});

async function onSubmit() {}

const quickChats = [
  { icon: "i-lucide-folder", label: "What projects has Sethy built?" },
  { icon: "i-lucide-wrench", label: "What are his main skills?" },
  { icon: "i-lucide-graduation-cap", label: "Where did he study?" },
  { icon: "i-lucide-briefcase", label: "What is his work experience?" },
  { icon: "i-lucide-award", label: "What are his achievements?" },
];
</script>

<template>
  <UDashboardPanel id="home" class="min-h-0" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <UDashboardNavbar
        class="absolute top-0 inset-x-0 border-b-0 z-10 backdrop-blur lg:backdrop-blur-none pointer-events-none sm:px-4"
        :ui="{ left: 'pointer-events-auto min-w-0', right: 'pointer-events-auto' }"
      >
        <template #left>
          <NuxtLink to="/" class="flex items-center gap-2">
            <UIcon name="i-lucide-sparkles" class="size-5 text-primary" />
            <span class="font-semibold tracking-tight">Recall</span>
          </NuxtLink>
        </template>

        <template #right>
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div ref="dropzoneRef" class="flex flex-1">
        <UContainer class="flex-1 flex flex-col justify-center gap-4 sm:gap-6 py-8">
          <h1 class="text-3xl sm:text-4xl text-highlighted font-bold">
            {{ greeting }}
          </h1>

          <UChatPrompt
            v-model="input"
            :status="loading ? 'streaming' : 'ready'"
            :rows="2"
            class="[view-transition-name:chat-prompt]"
            variant="subtle"
            :ui="{ trailing: 'pe-0 items-end' }"
            @submit="onSubmit"
          >
            <template #trailing>
              <UChatPromptSubmit color="neutral" />
            </template>
          </UChatPrompt>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="quickChat in quickChats"
              :key="quickChat.label"
              :icon="quickChat.icon"
              :label="quickChat.label"
              color="neutral"
              variant="outline"
              @click="input = quickChat.label"
            />
          </div>
        </UContainer>
      </div>
    </template>
  </UDashboardPanel>
</template>
