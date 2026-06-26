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

definePageMeta({ layout: "chat" });

const route = useRoute();
const toast = useToast();
const { model } = useModels();
const { csrf, headerName } = useCsrf();

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

const title = ref<string | null>(chatData.value?.title ?? null);

watch(
  () => chatData.value?.title,
  (next) => {
    title.value = next ?? null;
  },
);

const { dropzoneRef, dragging, open, files, uploading, uploadedFiles, removeFile, clearFiles } =
  useFileUploadWithStatus(route.params.id as string);

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

const input = ref("");

const chat = new Chat({
  id: chatData.value?.id,
  messages: chatData.value?.messages as UIMessage[],
  transport: new DefaultChatTransport({
    api: `/api/chats/${chatData.value!.id}`,
    headers: { [headerName]: csrf },
    body: {
      model: model.value,
    },
  }),
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

async function handleSubmit(e: Event) {
  e.preventDefault();
  if (input.value.trim() && !uploading.value) {
    chat.sendMessage({
      text: input.value,
      files: uploadedFiles.value.length > 0 ? uploadedFiles.value : undefined,
    });
    input.value = "";
    clearFiles();
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
        headers: { [headerName]: csrf },
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
        headers: { [headerName]: csrf },
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
          headers: { [headerName]: csrf },
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
  <UDashboardPanel
    v-if="chatData?.id"
    id="chat"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <ChatTitle :chat-id="chatData!.id" :title="title" @update:title="title = $event" />
        </template>
      </Navbar>
    </template>

    <template #body>
      <div ref="dropzoneRef" class="flex flex-1">
        <DragDropOverlay :show="dragging" />

        <UContainer class="flex-1 flex flex-col">
          <UChatMessages
            should-auto-scroll
            :messages="chat.messages"
            :status="chat.status"
            :spacing-offset="160"
            class="pt-(--ui-header-height)"
          >
            <template #indicator>
              <div class="flex items-center gap-1.5">
                <ChatIndicator />
                <UChatShimmer text="Thinking..." class="text-sm" />
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

          <UChatPrompt
            v-model="input"
            :error="chat.error"
            :disabled="uploading"
            variant="subtle"
            class="sticky bottom-0 [view-transition-name:chat-prompt] rounded-b-none z-10"
            :ui="{ base: 'px-1.5' }"
            @submit="handleSubmit"
          >
            <template v-if="files.length > 0" #header>
              <ChatFiles :files="files" @remove="removeFile" />
            </template>

            <template #footer>
              <div class="flex items-center gap-1">
                <ChatFileUploadButton :open="open" />
                <ModelSelect />
              </div>

              <UChatPromptSubmit
                :status="chat.status"
                :disabled="uploading"
                color="neutral"
                size="sm"
                @stop="chat.stop()"
                @reload="chat.regenerate()"
              />
            </template>
          </UChatPrompt>
        </UContainer>
      </div>
    </template>
  </UDashboardPanel>
</template>
