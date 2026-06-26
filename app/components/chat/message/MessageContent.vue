<script setup lang="ts">
import { isReasoningUIPart, isTextUIPart, isToolUIPart, getToolName } from "ai";
import type { UIMessage } from "ai";
import { isPartStreaming } from "@nuxt/ui/utils/ai";

defineProps<{
  message: UIMessage;
  editing: boolean;
}>();

const emit = defineEmits<{
  save: [message: UIMessage, text: string];
  cancelEdit: [];
}>();
</script>

<template>
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

    <template v-else-if="isToolUIPart(part)">
      <ChatToolRag
        v-if="getToolName(part) === 'Get Information'"
        :input="(part as { input?: { question?: string } }).input"
        :output="(part as { output?: Array<{ name: string; similarity: number }> }).output"
        :state="(part as { state?: 'input-available' | 'output-available' | 'output-error' }).state"
      />
    </template>

    <template v-else-if="isTextUIPart(part)">
      <ChatComark
        v-if="message.role === 'assistant'"
        :markdown="part.text"
        :streaming="isPartStreaming(part)"
      />
      <template v-else-if="message.role === 'user'">
        <ChatMessageEdit
          v-if="editing"
          :message="message"
          :text="part.text"
          @save="(msg, text) => emit('save', msg, text)"
          @cancel="emit('cancelEdit')"
        />
        <p v-else class="whitespace-pre-wrap">
          {{ part.text }}
        </p>
      </template>
    </template>
  </template>
</template>
