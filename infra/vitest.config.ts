import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // CDK synth (esbuild-bundling) is legitimately slow on a cold run.
    // process-upload's sharp bundling additionally shells out to Docker,
    // and in CI that Docker build runs under QEMU (arm64 emulated on the
    // amd64 runner) — much slower than a native build, well past 30s on a
    // cold image pull/build. Both timeouts need raising: testTimeout for
    // synth() calls made directly inside an `it`, hookTimeout for the ones
    // made in `beforeAll` (processing-stack.test.ts) — these are separate
    // Vitest config values, not one shared default.
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
