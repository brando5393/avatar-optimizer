import { describe, expect, it } from "vitest";
import {
  generateSessionToken,
  isValidSessionTokenFormat,
  SESSION_TOKEN_ENTROPY_BITS,
} from "../src/lib/session-token";

describe("generateSessionToken", () => {
  it("has at least 80 bits of entropy", () => {
    expect(SESSION_TOKEN_ENTROPY_BITS).toBeGreaterThanOrEqual(80);
  });

  it("produces a 4x4 dash-grouped uppercase Crockford base32 code", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  });

  it("never contains the ambiguous characters Crockford excludes (I, L, O, U)", () => {
    for (let i = 0; i < 200; i++) {
      const token = generateSessionToken();
      expect(token).not.toMatch(/[ILOU]/);
    }
  });

  it("is not predictable from a prior token (smoke test over many draws)", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      tokens.add(generateSessionToken());
    }
    // With 80 bits of entropy, 5000 draws colliding would indicate a broken RNG.
    expect(tokens.size).toBe(5000);
  });

  it("round-trips through isValidSessionTokenFormat", () => {
    for (let i = 0; i < 50; i++) {
      expect(isValidSessionTokenFormat(generateSessionToken())).toBe(true);
    }
  });
});

describe("isValidSessionTokenFormat", () => {
  it("accepts a lowercase submission (case-insensitive recovery)", () => {
    expect(isValidSessionTokenFormat("abcd-2345-6789-jkmn")).toBe(true);
  });

  it("rejects wrong grouping/length", () => {
    expect(isValidSessionTokenFormat("ABCD-2345-6789")).toBe(false);
    expect(isValidSessionTokenFormat("ABCDE-2345-6789-JKMN")).toBe(false);
  });

  it("rejects excluded ambiguous characters", () => {
    expect(isValidSessionTokenFormat("ILOU-2345-6789-JKMN")).toBe(false);
  });

  it("rejects garbage input without throwing", () => {
    expect(isValidSessionTokenFormat("<script>alert(1)</script>")).toBe(false);
    expect(isValidSessionTokenFormat("")).toBe(false);
  });
});
