import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/analysis/**/*.ts", "lib/scoring/**/*.ts", "lib/reporting/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
});
