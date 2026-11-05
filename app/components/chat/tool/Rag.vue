<script setup lang="ts">
interface ChatToolRagProps {
  input?: { question?: string };
  output?: Array<{
    content?: string;
    name?: string;
    similarity: number;
    documentTitle?: string | null;
  }>;
  state?: "input-available" | "output-available" | "output-error";
}

const props = defineProps<ChatToolRagProps>();

const isStreaming = computed(() => props.state === "input-available" || !props.state);
const hasOutput = computed(() => props.state === "output-available" && !!props.output?.length);

const query = computed(() => props.input?.question);
const count = computed(
  () =>
    new Set(props.output?.map((hit) => hit.documentTitle).filter(Boolean)).size ||
    props.output?.length ||
    0,
);

const label = computed(() => {
  if (isStreaming.value) return "Searching Sethy's notes...";
  if (hasOutput.value) return `Read ${count.value} source${count.value === 1 ? "" : "s"}`;
  return "No relevant notes found";
});
</script>

<template>
  <UChatTool :text="label" :suffix="query" :streaming="isStreaming" chevron="leading" />
</template>
