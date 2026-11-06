import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
      "#shared": fileURLToPath(new URL("./shared", import.meta.url)),
      "#server": fileURLToPath(new URL("./server", import.meta.url)),
    },
  },
  test: { include: ["test/unit/**/*.test.ts"], environment: "node" },
});
