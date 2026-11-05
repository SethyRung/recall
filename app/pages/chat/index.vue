<script setup lang="ts">
import { isSuccessResponse, type ApiResponse } from "#shared/types";

definePageMeta({ layout: "chat" });

useHead({ title: "Recall · New chat" });

const input = ref("");
const loading = ref(false);
const chatId = crypto.randomUUID();

async function createChat(prompt: string) {
  if (!prompt.trim() || loading.value) return;
  input.value = prompt;
  loading.value = true;

  try {
    const res = await $fetch<ApiResponse<{ id: string }>>("/api/chats", {
      method: "POST",
      body: {
        id: chatId,
        message: {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: prompt }],
        },
      },
    });

    refreshNuxtData("chats");
    if (isSuccessResponse(res)) {
      await navigateTo(`/chat/${res.data.id}`);
    } else {
      loading.value = false;
    }
  } catch {
    loading.value = false;
  }
}

async function onSubmit() {
  await createChat(input.value);
}

const quickChats = [
  {
    label: "What is Sethy working on?",
    icon: "i-lucide-sparkles",
  },
  {
    label: "Tell me about his stack",
    icon: "i-lucide-layers",
  },
  {
    label: "Recent projects",
    icon: "i-lucide-folder",
  },
  {
    label: "How does Recall work?",
    icon: "i-lucide-database",
  },
];
</script>

<template>
  <UDashboardPanel id="new-chat" class="min-h-0" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <Navbar />
    </template>

    <template #body>
      <div class="flex flex-1">
        <UContainer class="flex-1 flex flex-col justify-center gap-4 sm:gap-6 py-8">
          <h1 class="text-3xl sm:text-4xl text-highlighted font-bold">Ask Recall</h1>
          <p class="text-muted -mt-3">
            Every answer is grounded in Sethy's notes. No hallucinations — just citations.
          </p>

          <UChatPrompt
            v-model="input"
            :status="loading ? 'submitted' : 'ready'"
            class="[view-transition-name:chat-prompt]"
            variant="subtle"
            :ui="{ base: 'px-1.5' }"
            @submit="onSubmit"
          >
            <template #footer>
              <UChatPromptSubmit color="neutral" size="sm" class="ms-auto" />
            </template>
          </UChatPrompt>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="quickChat in quickChats"
              :key="quickChat.label"
              :icon="quickChat.icon"
              :label="quickChat.label"
              size="sm"
              color="neutral"
              variant="outline"
              class="rounded-full"
              @click="createChat(quickChat.label)"
            />
          </div>
        </UContainer>
      </div>
    </template>
  </UDashboardPanel>
</template>
