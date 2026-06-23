import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],

  modules: ["@nuxt/ui", "@vueuse/nuxt", "@nuxthub/core", "@comark/nuxt"],

  components: [{ path: "~/components", pathPrefix: false }],

  hub: {
    db: {
      dialect: "postgresql",
      driver: (process.env.DATABASE_DRIVER as "postgres-js" | "neon-http") ?? "postgres-js",
    },
  },

  runtimeConfig: {
    llmBaseUrl: "",
    llmApiKey: "",
    llmModel: "",
    embedBaseUrl: "",
    embedApiKey: "",
    embedModel: "",
    topK: 5,
    similarityThreshold: 0.3,
    chunkSize: 500,
    chunkOverlap: 50,
    betterAuthSecret: "",
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        "@ai-sdk/vue",
        "@comark/vue",
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "ai",
        "better-auth/client/plugins",
        "better-auth/vue",
      ],
    },
  },
});
