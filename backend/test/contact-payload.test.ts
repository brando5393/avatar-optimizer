import { describe, expect, it } from "vitest";
import { isValidContactPayload, MAX_MESSAGE_LENGTH } from "../src/lib/contact-payload";

describe("isValidContactPayload", () => {
  it("accepts a message and turnstile token with no email", () => {
    expect(isValidContactPayload({ message: "Hello", turnstileToken: "tok" })).toBe(true);
  });

  it("accepts a valid email when provided", () => {
    expect(
      isValidContactPayload({ message: "Hello", turnstileToken: "tok", email: "a@example.com" }),
    ).toBe(true);
  });

  it("rejects a missing or empty message", () => {
    expect(isValidContactPayload({ turnstileToken: "tok" })).toBe(false);
    expect(isValidContactPayload({ message: "   ", turnstileToken: "tok" })).toBe(false);
  });

  it("rejects a message over the max length", () => {
    expect(
      isValidContactPayload({ message: "a".repeat(MAX_MESSAGE_LENGTH + 1), turnstileToken: "tok" }),
    ).toBe(false);
  });

  it("rejects a missing turnstile token", () => {
    expect(isValidContactPayload({ message: "Hello" })).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(
      isValidContactPayload({ message: "Hello", turnstileToken: "tok", email: "not-an-email" }),
    ).toBe(false);
  });

  it("rejects non-object input without throwing", () => {
    expect(isValidContactPayload(null)).toBe(false);
    expect(isValidContactPayload("hello")).toBe(false);
    expect(isValidContactPayload(42)).toBe(false);
    expect(isValidContactPayload(undefined)).toBe(false);
  });
});
