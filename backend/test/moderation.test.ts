import { describe, expect, it, vi } from "vitest";
import { moderateImage } from "../src/lib/moderation";

function mockClient(response: { ModerationLabels?: Array<{ Name?: string; Confidence?: number }> }) {
  return { send: vi.fn().mockResolvedValue(response) };
}

describe("moderateImage", () => {
  it("is safe when no labels are returned", async () => {
    const client = mockClient({ ModerationLabels: [] });
    const result = await moderateImage(Buffer.from("fake"), client);
    expect(result.isSafe).toBe(true);
    expect(result.labels).toEqual([]);
  });

  it("is unsafe and lists label names when Rekognition flags content", async () => {
    const client = mockClient({ ModerationLabels: [{ Name: "Explicit Nudity", Confidence: 91 }] });
    const result = await moderateImage(Buffer.from("fake"), client);
    expect(result.isSafe).toBe(false);
    expect(result.labels).toEqual(["Explicit Nudity"]);
  });

  it("sends the image bytes and a minimum confidence threshold", async () => {
    const client = mockClient({ ModerationLabels: [] });
    await moderateImage(Buffer.from("fake-bytes"), client);
    const [command] = client.send.mock.calls[0];
    expect(command.input.MinConfidence).toBe(75);
    expect(Buffer.isBuffer(command.input.Image.Bytes) || command.input.Image.Bytes instanceof Uint8Array).toBe(
      true,
    );
  });
});
