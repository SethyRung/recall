import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],

  modules: ["@nuxt/ui", "@vueuse/nuxt", "@nuxthub/core", "@nuxtjs/better-auth", "@comark/nuxt"],

  hub: {
    db: {
      dialect: "postgresql",
      driver: (process.env.DATABASE_DRIVER as "postgres-js" | "neon-http") ?? "postgres-js",
    },
    blob: true,
  },

  runtimeConfig: {
    appSecret: "",
    chatApiKey: "",
    chatApiTrustedOrigins: "",
  },

  auth: {
    schema: {
      casing: "snake_case",
    },
    redirects: {
      login: "/auth",
      guest: "/",
      authenticated: "/",
      logout: "/",
    },
  },

  routeRules: {
    "/admin": { auth: { user: { role: "admin" } } },
    "/admin/**": { auth: { user: { role: "admin" } } },
    "/api/admin/**": { auth: { user: { role: "admin" } } },
    "/auth": { auth: "guest" },
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
