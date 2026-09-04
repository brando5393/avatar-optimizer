import { describe, expect, it } from "vitest";
import { newExpiresAt, RETENTION_SECONDS } from "../src/lib/session-record";

describe("newExpiresAt", () => {
  it("is exactly RETENTION_SECONDS after the given time", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(newExpiresAt(now)).toBe(Math.floor(now.getTime() / 1000) + RETENTION_SECONDS);
  });

  it("defaults to 72 hours", () => {
    expect(RETENTION_SECONDS).toBe(72 * 60 * 60);
  });
});
