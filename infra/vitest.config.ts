import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // CDK synth (esbuild-bundling the autoDeleteObjects custom resource) is
    // legitimately slow on a cold run — well past Vitest's 5s default.
    testTimeout: 30_000,
  },
});
