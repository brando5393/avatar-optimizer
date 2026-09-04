import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest-setup.ts"],
  },
  // Vitest otherwise resolves Svelte's SSR build, which doesn't support
  // mount() — component tests need the browser build. See
  // https://svelte.dev/docs/svelte/testing
  resolve: process.env.VITEST ? { conditions: ["browser"] } : undefined,
});
