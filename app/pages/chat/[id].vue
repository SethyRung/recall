<script setup lang="ts">
import { Chat } from "@ai-sdk/vue";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { isSuccessResponse, type ApiResponse } from "#shared/types";
import { unwrap } from "#shared/utils/api";

type ChatDetail = {
  id: string;
  createdAt: Date;
  title: string | null;
  visitorId: string;
  messages: UIMessage[];
};
type Vote = { chatId: string; messageId: string; isUpvoted: boolean };

definePageMeta({ keepalive: { max: 20 } });

const route = useRoute();
const toast = useToast();
const { data: chatEnvelope } = await useFetch<ApiResponse<ChatDetail>>(
  `/api/chats/${route.params.id}`,
  {
    key: `chat-${route.params.id}`,
    cache: "force-cache",
  },
);

const chatData = computed<ChatDetail | null>(() =>
  chatEnvelope.value && isSuccessResponse(chatEnvelope.value) ? chatEnvelope.value.data : null,
);

if (!chatData.value) {
  throw createError({ statusCode: 404, statusMessage: "Chat not found" });
}

useHead({ title: () => `${chatData.value?.title || "Chat"} · Recall` });

const { data: votesEnvelope, refresh: refreshVotes } = await useLazyFetch<ApiResponse<Vote[]>>(
  `/api/chats/${route.params.id}/votes`,
);

const votes = ref<Vote[]>(
  votesEnvelope.value && isSuccessResponse(votesEnvelope.value) ? votesEnvelope.value.data : [],
);

watch(
  votesEnvelope,
  (env) => {
    if (env && isSuccessResponse(env)) {
      votes.value = env.data;
    }
  },
  { deep: true },
);

const { tabs: openTabs, useDraft } = useChatTabs();
const input = useDraft(chatData.value!.id);

const chat = new Chat({
  id: chatData.value?.id,
  messages: chatData.value?.messages as UIMessage[],
  transport: new DefaultChatTransport({
    api: `/api/chats/${chatData.value!.id}`,
    prepareSendMessagesRequest: ({ messages }) => ({
      body: {
        messages: messages.slice(-1).map((message) => ({
          ...message,
          parts: message.parts.filter((part) => part.type === "text"),
        })),
      },
    }),
  }),
  async onFinish() {
    if (!openTabs.value.some((tab) => tab.chatId === chat.id)) return;
    if (!chatData.value?.title) {
      await refreshNuxtData(`chat-${route.params.id}`);
      await refreshNuxtData("chats");
    }
  },
  onError(error) {
    let message = error.message;
    if (typeof message === "string" && message[0] === "{") {
      try {
        message = JSON.parse(message).message || message;
      } catch {
        // keep original message on malformed JSON
      }
    }
    toast.add({
      description: message,
      icon: "i-lucide-alert-circle",
      color: "error",
      duration: 0,
    });
  },
});

watch(
  () => openTabs.value.some((tab) => tab.chatId === chat.id),
  (open) => {
    if (!open) chat.stop();
  },
);
onUnmounted(() => chat.stop());
const active = ref(true);
onActivated(() => {
  active.value = true;
  if (!chatData.value) showError({ statusCode: 404, statusMessage: "Chat not found" });
});
onDeactivated(() => {
  active.value = false;
});

async function handleSubmit(e: Event) {
  e.preventDefault();
  if (input.value.trim()) {
    chat.sendMessage({
      text: input.value,
    });
    input.value = "";
  }
}

const editingMessageId = ref<string | null>(null);

function startEdit(message: UIMessage) {
  if (editingMessageId.value) return;
  editingMessageId.value = message.id;
}

async function saveEdit(message: UIMessage, text: string) {
  try {
    unwrap(
      await $fetch<ApiResponse<null>>(`/api/chats/${chatData.value!.id}/messages`, {
        method: "DELETE",
        body: { messageId: message.id, type: "edit" },
      }),
    );
  } catch {
    toast.add({
      description: "Failed to save edit.",
      icon: "i-lucide-alert-circle",
      color: "error",
    });
    return;
  }

  editingMessageId.value = null;
  chat.sendMessage({ text, messageId: message.id });
}

async function regenerateMessage(message: UIMessage) {
  try {
    unwrap(
      await $fetch<ApiResponse<null>>(`/api/chats/${chatData.value!.id}/messages`, {
        method: "DELETE",
        body: { messageId: message.id, type: "regenerate" },
      }),
    );
  } catch {
    toast.add({
      description: "Failed to regenerate.",
      icon: "i-lucide-alert-circle",
      color: "error",
    });
    return;
  }

  chat.regenerate({ messageId: message.id });
}

function getVote(messageId: string): boolean | null {
  const vote = votes.value.find((v) => v.messageId === messageId);
  if (!vote) return null;
  return !!vote.isUpvoted;
}

async function vote(message: UIMessage, isUpvoted: boolean) {
  const snapshot = votes.value.map((v) => ({ ...v }));
  const toggling = getVote(message.id) === isUpvoted;
  const next = toggling ? null : isUpvoted;

  votes.value =
    next === null
      ? votes.value.filter((v) => v.messageId !== message.id)
      : [
          ...votes.value.filter((v) => v.messageId !== message.id),
          { chatId: chatData.value!.id, messageId: message.id, isUpvoted: next } as never,
        ];

  try {
    unwrap(
      await $fetch<ApiResponse<{ chatId: string; messageId: string; isUpvoted: boolean | null }>>(
        `/api/chats/${chatData.value!.id}/votes`,
        {
          method: "POST",
          body:
            next === null ? { messageId: message.id } : { messageId: message.id, isUpvoted: next },
        },
      ),
    );
  } catch {
    votes.value = snapshot;
    toast.add({
      description: "Failed to save vote",
      icon: "i-lucide-alert-circle",
      color: "error",
    });
  }
}

onMounted(() => {
  if (chatData.value?.messages.length === 1) {
    chat.regenerate();
  }
});
</script>

<template>
  <section v-if="chatData?.id" class="flex min-h-0 flex-1 flex-col">
    <div class="mx-auto flex min-h-0 w-full max-w-215 flex-1 flex-col px-5 pt-5 md:px-10 md:pt-6">
      <div class="relative min-h-0 flex-1 overflow-y-auto">
        <UChatMessages
          :should-auto-scroll="active"
          :messages="chat.messages"
          :status="chat.status"
          :user="{ side: 'left', variant: 'naked' }"
          :assistant="{ side: 'left', variant: 'naked' }"
          :ui="{ root: 'px-0' }"
        >
          <template #header="{ message }">
            <div
              class="mb-2 flex items-center gap-2.5 text-xs"
              :class="message.role === 'user' ? 'text-muted' : 'text-primary'"
            >
              <span>{{ message.role === "user" ? "❯" : "[r_]" }}</span>
              <span>{{ message.role === "user" ? "you" : "recall" }}</span>
            </div>
          </template>

          <template #indicator>
            <div class="flex items-center gap-2 text-primary">
              <ChatIndicator />
              <span class="text-xs">searching, thinking, connecting...</span>
            </div>
          </template>

          <template #files="{ message, parts }">
            <ChatFilePreview
              v-for="(part, index) in parts"
              :key="`${message.id}-${index}`"
              :name="getFileName(part.url)"
              :type="part.mediaType"
              :preview-url="part.url"
              size="3xl"
            />
          </template>

          <template #content="{ message }">
            <ChatMessageContent
              :message="message"
              :editing="editingMessageId === message.id"
              @save="saveEdit"
              @cancel-edit="editingMessageId = null"
            />
          </template>

          <template #actions="{ message }">
            <ChatMessageActions
              :message="message"
              :streaming="
                chat.status === 'streaming' &&
                message.id === chat.messages[chat.messages.length - 1]?.id
              "
              :editing="editingMessageId === message.id"
              :vote="getVote(message.id)"
              @vote="(_message, isUpvoted) => vote(_message, isUpvoted)"
              @edit="startEdit"
              @regenerate="regenerateMessage"
            />
          </template>
        </UChatMessages>
      </div>

      <div class="z-5 shrink-0 bg-default pt-4 pb-3.5 md:pb-5.5">
        <ChatPrompt
          v-model="input"
          :status="chat.status"
          :error="chat.error"
          @submit="handleSubmit"
          @stop="chat.stop()"
          @reload="chat.regenerate()"
        />
      </div>
    </div>
  </section>
</template>
