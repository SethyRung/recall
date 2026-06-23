import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],

  modules: ["@nuxt/ui", "@vueuse/nuxt", "@nuxthub/core", "@comark/nuxt"],

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
        "@shikijs/langs/c",
        "@shikijs/langs/cpp",
        "@shikijs/langs/css",
        "@shikijs/langs/diff",
        "@shikijs/langs/dockerfile",
        "@shikijs/langs/go",
        "@shikijs/langs/graphql",
        "@shikijs/langs/html",
        "@shikijs/langs/java",
        "@shikijs/langs/kotlin",
        "@shikijs/langs/php",
        "@shikijs/langs/python",
        "@shikijs/langs/ruby",
        "@shikijs/langs/rust",
        "@shikijs/langs/sql",
        "@shikijs/langs/swift",
        "@shikijs/langs/toml",
        "@shikijs/langs/xml",
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "ai",
        "better-auth/client/plugins",
        "better-auth/vue",
        "zod",
      ],
    },
  },
});
