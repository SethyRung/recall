<script setup lang="ts">
useHead({ title: "Recall · A thinking partner grounded in Sethy's notes" });

const steps = [
  {
    eyebrow: "01",
    title: "Retrieve",
    body: "Your question hits pgvector and pulls the most relevant markdown chunks from Sethy's notes — not the open web.",
  },
  {
    eyebrow: "02",
    title: "Reason",
    body: "The chat model reads those chunks, decides if they're enough, and writes a grounded answer in plain language.",
  },
  {
    eyebrow: "03",
    title: "Remember",
    body: "Every conversation is saved under a private visitor ID — reload, come back tomorrow, pick up exactly where you left off.",
  },
];

const stack = [
  { name: "Nuxt 4" },
  { name: "Postgres + pgvector" },
  { name: "Better Auth" },
  { name: "AI SDK" },
  { name: "Comark" },
  { name: "Drizzle" },
];
</script>

<template>
  <div class="space-y-20 py-10">
    <UContainer class="grid lg:grid-cols-2 gap-14 lg:gap-20">
      <div class="text-center lg:text-left space-y-6">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-elevated text-toned text-xs font-medium tracking-wide uppercase"
        >
          <span class="size-1.5 rounded-full bg-primary animate-ping" />
          RAG chatbot
        </span>

        <h1 class="text-5xl sm:text-6xl lg:text-7xl font-semibold text-highlighted">
          Hi, I'm <span class="font-pixel font-medium text-primary">Recall</span>
        </h1>

        <p class="text-lg sm:text-xl text-muted leading-relaxed max-w-2xl mx-auto">
          Ask me anything about Sethy's work, projects, and ideas. Every answer is grounded in his
          actual notes — and your conversation saves itself, no account needed.
        </p>

        <div class="flex flex-wrap items-center lg:justify-normal justify-center gap-3 pt-2">
          <UButton icon="i-lucide-message-circle" label="Start chatting" to="/chat" />
          <UButton label="How it works" color="neutral" variant="outline" to="#how" />
        </div>
      </div>

      <div
        class="max-w-2xl mx-auto grid grid-rows-[auth_1fr_auto] ring ring-default rounded-xl overflow-hidden"
      >
        <div class="flex items-center gap-1.5 px-4 py-3 bg-muted">
          <span class="size-2.5 rounded-full bg-primary/30" />
          <span class="size-2.5 rounded-full bg-primary/50" />
          <span class="size-2.5 rounded-full bg-primary/80" />
          <span class="ml-3 text-xs font-mono text-muted">recall · chat</span>
        </div>

        <div class="p-5 sm:p-6 font-mono text-sm text-toned space-y-3 leading-relaxed">
          <div class="flex items-center gap-2.5 text-toned/70">
            <UIcon name="i-lucide-chevron-right" class="text-primary shrink-0" />
            <p>What is Sethy building right now?</p>
          </div>
          <p class="ml-6">
            A Nuxt 4 RAG prototype on Postgres + pgvector, with an anonymous-friendly chat that
            remembers each visitor's history...
          </p>

          <div class="flex items-center gap-2.5">
            <UIcon name="i-lucide-chevron-right" class="text-primary shrink-0" />
            <p class="text-toned/70">Which model backs it?</p>
          </div>
          <p class="ml-6">Chat streams through LLM; embeddings use a separate model.</p>
        </div>

        <div class="px-4 py-2.5 bg-muted text-xs font-mono text-muted flex items-center gap-1">
          <UIcon name="i-lucide-circle-dot" class="text-primary size-3" />
          <span>ready · 4 sources cited</span>
        </div>
      </div>
    </UContainer>

    <UContainer id="how">
      <div class="max-w-2xl mb-12">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-elevated text-toned text-xs font-medium tracking-wide uppercase"
        >
          <UIcon name="i-lucide-sliders-horizontal" class="text-primary" />
          How it works
        </span>
        <h2
          class="mt-4 text-3xl sm:text-4xl lg:text-5xl font-medium tracking-[-0.02em] text-highlighted leading-[1.05]"
        >
          Three steps, <span class="font-pixel text-primary">fully visible</span>
        </h2>
        <p class="mt-4 text-muted leading-relaxed">
          No black box. Retrieval, reasoning, and persistence are all part of the same surface — you
          can see what Recall reads before it answers.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <article
          v-for="step in steps"
          :key="step.title"
          class="rounded-xl bg-muted ring-1 ring-default p-6 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="font-pixel text-primary text-xs leading-none tracking-tighter">
              {{ step.eyebrow }}
            </span>
          </div>
          <h3 class="text-xl font-medium text-highlighted tracking-tight">
            {{ step.title }}
          </h3>
          <p class="text-sm text-muted leading-relaxed">{{ step.body }}</p>
        </article>
      </div>
    </UContainer>

    <UContainer id="exchange">
      <div class="max-w-2xl mb-12">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-elevated text-toned text-xs font-medium tracking-wide uppercase"
        >
          <UIcon name="i-lucide-terminal" class="text-primary" />
          A real exchange
        </span>
        <h2
          class="mt-4 text-3xl sm:text-4xl lg:text-5xl font-medium tracking-[-0.02em] text-highlighted leading-[1.05]"
        >
          Answered, <span class="font-pixel text-primary">not guessed</span>
        </h2>
        <p class="mt-4 text-muted leading-relaxed">
          Every response cites the notes it read. If Recall can't find anything relevant, it says so
          — instead of inventing an answer.
        </p>
      </div>

      <div class="rounded-xl bg-muted ring ring-default overflow-hidden divide-y divide-default">
        <div class="px-5 py-4">
          <p class="text-base sm:text-lg text-highlighted leading-relaxed">
            What tools does Sethy reach for most when shipping a side project?
          </p>
        </div>

        <div class="px-5 py-4 space-y-4 bg-default">
          <div
            class="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-toned"
          >
            <UIcon name="i-lucide-sparkles" class="text-primary" />
            <span>recall</span>
          </div>
          <div class="space-y-4 text-default leading-relaxed">
            <p>
              Three things show up again and again in Sethy's notes:
              <strong class="text-highlighted">Bun</strong>
              as the runtime and package manager,
              <strong class="text-highlighted">Postgres</strong> with
              <strong class="text-highlighted">pgvector</strong> for storage and retrieval, and
              <strong class="text-highlighted">Nuxt UI</strong> for the surface itself.
            </p>

            <p>
              The pattern across recent projects is consistent — small, well-typed API layer, a few
              server-rendered pages, and a chat surface that uses the same primitives. Less is more.
            </p>

            <USeparator />

            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-mono uppercase tracking-wider text-toned mr-1">
                sources
              </span>

              <span
                v-for="source in ['stack.md', 'projects.md', 'notes/2026-q2.md']"
                :key="source"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-elevated ring-1 ring-default text-xs text-toned"
              >
                <UIcon name="i-lucide-arrow-up-right" class="text-primary size-3" />
                {{ source }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </UContainer>

    <UContainer>
      <div class="max-w-2xl mb-10">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-toned text-xs font-medium tracking-wide uppercase ring-1 ring-default"
        >
          <UIcon name="i-lucide-package" class="text-primary" />
          Built with
        </span>
        <h2
          class="mt-4 text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-highlighted leading-[1.05]"
        >
          Boring tools, <span class="font-pixel text-primary">deliberately</span>
        </h2>
      </div>

      <ul class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <template v-for="(tech, i) in stack" :key="tech.name">
          <li>
            <UBadge color="neutral" variant="outline" size="md">
              <template #leading>
                <UIcon name="i-lucide-chevron-right" class="text-primary size-3" />
              </template>
              {{ tech.name }}
            </UBadge>
          </li>
          <UIcon
            v-if="i < stack.length - 1"
            name="i-lucide-plus"
            class="text-dimmed size-3 select-none"
            aria-hidden="true"
          />
        </template>
      </ul>
    </UContainer>
  </div>
</template>
