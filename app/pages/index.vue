<script setup lang="ts">
import { isReasoningUIPart, isTextUIPart } from "ai";
import { Chat } from "@ai-sdk/vue";
import { isPartStreaming } from "@nuxt/ui/utils/ai";

const toast = useToast();

const input = ref("");
const loading = ref(false);

const models = [
  {
    label: "MiniMax-M2.7",
    value: "MiniMax-M2.7",
    icon: "i-simple-icons:minimax",
  },
];

const model = ref(models[0]!.value);

const chat = new Chat({
  onError(error) {
    toast.add({
      title: "Recall had trouble responding",
      description: error.message,
      color: "error",
      icon: "i-lucide:circle-x",
    });
  },
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  let timeGreeting = "Good evening";
  if (hour < 12) timeGreeting = "Good morning";
  else if (hour < 18) timeGreeting = "Good afternoon";

  return timeGreeting;
});

async function onSubmit() {
  chat.sendMessage({ text: input.value });
  input.value = "";
}

async function onSubmitQuickChat(text: string) {
  chat.sendMessage({ text });
}
</script>

<template>
  <UDashboardPanel id="home" :ui="{ body: 'py-0 sm:py-0 grid grid-rows-[auto_1fr]' }">
    <template #body>
      <div class="py-3 px-2.5 flex justify-between items-center">
        <NuxtLink to="/" class="flex items-center gap-2">
          <UIcon name="i-lucide-sparkles" class="size-5 text-primary" />
          <span class="font-semibold tracking-tight">Recall</span>
        </NuxtLink>

        <UColorModeButton />
      </div>

      <UContainer class="h-full overflow-auto space-y-6 relative">
        <h1
          v-if="chat.messages.length == 0"
          class="text-3xl sm:text-4xl text-highlighted font-bold"
        >
          {{ greeting }}
        </h1>

        <UChatMessages
          v-else
          should-auto-scroll
          :messages="chat.messages"
          :status="chat.status"
          :spacing-offset="80"
        >
          <template #indicator>
            <div class="flex items-center gap-1.5">
              <ChatIndicator />

              <UChatShimmer text="Thinking..." class="text-sm" />
            </div>
          </template>

          <template #content="{ message }">
            <template
              v-for="(part, index) in getMergedParts(message.parts)"
              :key="`${message.id}-${part.type}-${index}`"
            >
              <UChatReasoning
                v-if="isReasoningUIPart(part)"
                :text="part.text"
                :streaming="isPartStreaming(part)"
                chevron="leading"
              >
                <ChatComark :markdown="part.text" :streaming="isPartStreaming(part)" />
              </UChatReasoning>

              <template v-else-if="isTextUIPart(part)">
                <ChatComark
                  v-if="message.role === 'assistant'"
                  :markdown="part.text"
                  :streaming="isPartStreaming(part)"
                />
                <template v-else-if="message.role === 'user'">
                  <p class="whitespace-pre-wrap">
                    {{ part.text }}
                  </p>
                </template>
              </template>
            </template>
          </template>
        </UChatMessages>

        <UChatPrompt
          v-model="input"
          :error="chat.error"
          variant="soft"
          :ui="{
            root: 'sticky bottom-0 [view-transition-name:chat-prompt] z-10',
            base: 'px-1.5',
          }"
          @submit="onSubmit"
        >
          <template #footer>
            <div class="flex items-center gap-1">
              <USelectMenu
                v-model="model"
                :items="models"
                :icon="models.find((m) => m.value === model)?.icon"
                variant="ghost"
                value-key="value"
                :ui="{
                  trailingIcon:
                    'group-data-[state=open]:rotate-180 transition-transform duration-200',
                }"
              />
            </div>

            <UChatPromptSubmit
              :status="chat.status"
              color="neutral"
              @stop="chat.stop()"
              @reload="chat.regenerate()"
            />
          </template>
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
