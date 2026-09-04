import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { FILTERS } from "../src/lib/filters";
import { processImage } from "../src/lib/image-processing";
import { PRESETS } from "../src/lib/presets";

async function solidColorPng(width: number, height: number, r: number, g: number, b: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r, g, b } } })
    .png()
    .toBuffer();
}

describe("processImage", () => {
  it("produces one output per preset x filter combination", async () => {
    const input = await solidColorPng(200, 150, 200, 80, 40);
    const outputs = await processImage(input);
    expect(outputs).toHaveLength(PRESETS.length * FILTERS.length);
  });

  it("resizes every output to its preset's exact square dimensions as a JPEG", async () => {
    const input = await solidColorPng(300, 200, 10, 200, 10);
    const outputs = await processImage(input);

    for (const output of outputs) {
      const preset = PRESETS.find((p) => p.id === output.presetId);
      expect(preset).toBeDefined();
      const metadata = await sharp(output.buffer).metadata();
      expect(metadata.width).toBe(preset!.width);
      expect(metadata.height).toBe(preset!.height);
      expect(metadata.format).toBe("jpeg");
    }
  });

  it("the original filter stays clearly color-dominant like the source", async () => {
    const input = await solidColorPng(100, 100, 220, 30, 30);
    const outputs = await processImage(input);
    const original = outputs.find((o) => o.presetId === "tiktok" && o.filterId === "original")!;
    const stats = await sharp(original.buffer).stats();
    expect(stats.channels[0].mean).toBeGreaterThan(stats.channels[1].mean + 50);
  });

  it("the black-and-white filter equalizes the R/G/B channel means", async () => {
    const input = await solidColorPng(100, 100, 220, 30, 30);
    const outputs = await processImage(input);
    const bw = outputs.find((o) => o.presetId === "tiktok" && o.filterId === "blackAndWhite")!;
    const stats = await sharp(bw.buffer).stats();
    const [r, g, b] = stats.channels;
    expect(Math.abs(r.mean - g.mean)).toBeLessThan(2);
    expect(Math.abs(g.mean - b.mean)).toBeLessThan(2);
  });
});
