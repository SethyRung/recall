<script setup lang="ts">
import { isSuccessResponse, type ApiResponse } from "#shared/types";

const route = useRoute();
const { activeId, useDraft, promoteTab } = useChatTabs();
const tabId = activeId.value;
const input = useDraft(tabId);
const { user } = useUserSession();
const owner = user.value?.id ?? "visitor";
const request = useState(`chat-tab-request:${owner}:${tabId}`, () => ({
  loading: false,
  error: "",
}));
const { loading, error } = toRefs(request.value);
const prompt = useTemplateRef("prompt");

const wordmark = [
  "██████╗ ███████╗ ██████╗ █████╗ ██╗     ██╗     ",
  "██╔══██╗██╔════╝██╔════╝██╔══██╗██║     ██║     ",
  "██████╔╝█████╗  ██║     ███████║██║     ██║     ",
  "██╔══██╗██╔══╝  ██║     ██╔══██║██║     ██║     ",
  "██║  ██║███████╗╚██████╗██║  ██║███████╗███████╗",
  "╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝",
].join("\n");

const suggestions = [
  { label: "whoami", description: "Get to know Sethy", prompt: "Tell me about Sethy." },
  {
    label: "ls projects/",
    description: "See what he's building",
    prompt: "What is Sethy working on?",
  },
  {
    label: "cat stack.md",
    description: "Explore his toolbox",
    prompt: "Tell me about Sethy's stack.",
  },
];

function selectPrompt(value: string) {
  input.value = value;
  prompt.value?.focus();
}

watch(
  () => route.query.q,
  (value) => {
    if (typeof value === "string") {
      input.value = value;
      nextTick(() => prompt.value?.focus());
    }
  },
  { immediate: true },
);

async function createChat() {
  const text = input.value.trim();
  if (!text || loading.value) return;
  loading.value = true;
  error.value = "";

  try {
    const res = await $fetch<ApiResponse<{ id: string }>>("/api/chats", {
      method: "POST",
      body: {
        id: crypto.randomUUID(),
        message: {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text }],
        },
      },
    });

    if (!isSuccessResponse(res)) {
      error.value = "Couldn't start this session. Please try again.";
      return;
    }
    await refreshNuxtData("chats");
    if ((user.value?.id ?? "visitor") === owner) await promoteTab(tabId, res.data.id);
  } catch {
    error.value = "Couldn't connect. Your question is still here — try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="flex w-full flex-1 flex-col">
    <div
      class="m-auto w-full max-w-2xl px-4 pt-8 pb-6 sm:px-6 md:max-w-3xl md:px-8 md:pt-10 md:pb-8 lg:px-12"
    >
      <div class="mb-6 flex items-center gap-2 text-xs tracking-widest text-muted">
        <span class="inline-block size-1.5 shrink-0 bg-primary" />
        A PERSONAL KNOWLEDGE TERMINAL
      </div>

      <h1 id="welcome-heading" class="sr-only">Recall. A terminal into Sethy's world.</h1>
      <pre
        class="mb-6 overflow-x-auto font-mono text-xs leading-tight tracking-tight whitespace-pre text-primary sm:text-sm md:text-xs xl:text-sm"
        v-text="wordmark"
      />

      <div class="text-xs leading-loose">
        <p class="mb-2 text-base tracking-tighter text-highlighted md:text-lg">
          A terminal into Sethy's
          <span>world</span>
          <span class="text-primary">.</span>
        </p>
        <p class="text-muted">
          His work, projects, and things he's figuring out.
          <br class="hidden sm:block" />
          Ask a question. Follow the sources. Go down a rabbit hole.
        </p>
      </div>

      <USeparator
        label="start somewhere"
        position="start"
        class="mt-6 mb-2.5 md:mt-7"
        :ui="{ container: 'text-dimmed', label: 'text-xs', border: 'border-muted' }"
      />

      <div class="mb-6 grid">
        <UButton
          color="neutral"
          variant="ghost"
          v-for="suggestion in suggestions"
          :key="suggestion.label"
          type="button"
          class="group/suggestion w-full justify-start gap-3 px-0 py-2.5 text-left text-xs font-normal hover:bg-muted/50 md:gap-4 md:py-2"
          :disabled="loading"
          @click="selectPrompt(suggestion.prompt)"
        >
          <span
            class="w-32 shrink-0 text-toned group-hover/suggestion:text-primary sm:w-36 lg:w-40"
          >
            <span class="mr-2 text-dimmed">$</span>
            {{ suggestion.label }}
          </span>
          <span class="min-w-0 flex-1 text-xs text-muted">{{ suggestion.description }}</span>
          <span class="ml-auto shrink-0 text-dimmed group-hover/suggestion:text-primary">↗</span>
        </UButton>
      </div>

      <ChatPrompt
        ref="prompt"
        v-model="input"
        :status="loading ? 'submitted' : 'ready'"
        :starting="loading"
        @submit="createChat"
      />
      <p v-if="error" role="alert" class="mt-3 text-sm text-error">{{ error }}</p>

      <p class="mt-4 flex items-center justify-center gap-2 text-center text-xs text-dimmed">
        <UIcon name="i-lucide-file-check-2" class="size-3.5 shrink-0" />
        Grounded in real notes. Sources included. No account needed.
      </p>
    </div>
    <div
      class="flex justify-between gap-4 px-4 pt-3 pb-5 text-xs text-dimmed sm:px-6 md:pt-2.5 md:pb-4"
    >
      <span>less interface. more conversation.</span>
      <span class="hidden md:inline">
        made by sethy
        <span class="text-primary">↗</span>
      </span>
    </div>
  </section>
</template>
