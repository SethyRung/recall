import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],

  modules: ["@nuxt/ui", "@vueuse/nuxt", "@nuxthub/core", "@comark/nuxt", "nuxt-csurf"],

  hub: {
    db: {
      dialect: "postgresql",
      driver: (process.env.DATABASE_DRIVER as "postgres-js" | "neon-http") ?? "postgres-js",
    },
    blob: true,
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

  routeRules: {
    "/api/auth/**": { csurf: false } as never,
  },

  nitro: {
    experimental: {
      tasks: true,
    },
  },

  vite: {
    plugins: [tailwindcss() as any],
    optimizeDeps: {
      include: [],
    },
  },

  fonts: {
    families: [
      { name: "Geist", provider: "local" },
      { name: "Geist Mono", provider: "local" },
      { name: "Geist Pixel", provider: "local" },
    ],
  },
});
