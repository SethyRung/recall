<script setup lang="ts">
useHead({ title: "Recall · A terminal into Sethy's world" });

const { newTab } = useChatTabs();
const { helpOpen } = useTerminal();
const topics = [
  {
    file: "about.md",
    icon: "i-lucide-file-user",
    title: "Meet Sethy",
    description: "The person behind the notes.",
    prompt: "Tell me about Sethy.",
  },
  {
    file: "projects/",
    icon: "i-lucide-folder-code",
    title: "Follow the work",
    description: "Projects, experiments, and ideas.",
    prompt: "What is Sethy working on?",
  },
  {
    file: "toolbox.md",
    icon: "i-lucide-file-code-2",
    title: "Open the toolbox",
    description: "The tools behind the projects.",
    prompt: "Tell me about Sethy's stack.",
  },
];
</script>

<template>
  <section class="flex w-full flex-1 flex-col">
    <div class="m-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
      <div class="grid gap-8 lg:grid-cols-3 lg:items-end lg:gap-10">
        <div class="lg:col-span-2">
          <p class="mb-5 text-xs tracking-widest text-primary">[r_] RECALL</p>
          <h1
            id="overview-heading"
            class="font-pixel text-4xl leading-tight tracking-tight text-highlighted sm:text-5xl"
          >
            A second brain.
            <br />
            A first
            <span>conversation</span>
            <span class="text-primary">.</span>
          </h1>
          <p class="mt-5 max-w-lg text-xs leading-7 text-muted sm:text-sm">
            An open window into Sethy's world. Explore his work, the tools he uses, and the things
            he's figuring out — through his own notes.
          </p>
        </div>

        <div class="border border-accented bg-muted/30">
          <div class="border-b border-accented px-4 py-2.5 text-xs text-muted">quickstart</div>
          <div class="p-4">
            <p class="mb-3 flex items-center gap-2 text-xs text-toned">
              <span class="text-primary">❯</span>
              recall --new
            </p>
            <p class="mb-5 text-xs leading-6 text-muted">
              Start with a question.
              <br />
              See where it takes you.
            </p>
            <UButton
              label="Start a session"
              trailing-icon="i-lucide-arrow-up-right"
              block
              class="justify-between rounded-none px-3 py-2.5 text-xs"
              @click="newTab()"
            />
          </div>
        </div>
      </div>

      <USeparator
        label="explore sethy/"
        position="start"
        class="mt-10 mb-5"
        :ui="{ label: 'text-xs text-muted', border: 'border-accented' }"
      />

      <div class="grid gap-3 sm:grid-cols-3">
        <UButton
          v-for="topic in topics"
          :key="topic.file"
          color="neutral"
          variant="ghost"
          class="group flex-col items-start gap-0 rounded-none border border-accented p-4 text-left font-normal hover:bg-muted/50"
          @click="newTab(topic.prompt)"
        >
          <span class="mb-5 flex w-full items-center gap-2 text-xs text-primary">
            <UIcon :name="topic.icon" class="size-4 shrink-0" />
            {{ topic.file }}
            <UIcon
              name="i-lucide-arrow-up-right"
              class="ml-auto size-3.5 text-dimmed group-hover:text-primary"
            />
          </span>
          <span class="text-xs text-highlighted">{{ topic.title }}</span>
          <span class="mt-2 text-xs leading-5 text-muted">{{ topic.description }}</span>
        </UButton>
      </div>
    </div>
  </section>
</template>
