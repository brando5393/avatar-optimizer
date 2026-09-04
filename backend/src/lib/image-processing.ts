import sharp from "sharp";
import { FILTERS, type FilterId } from "./filters";
import { PRESETS } from "./presets";

export interface ProcessedOutput {
  presetId: string;
  filterId: FilterId;
  buffer: Buffer;
  contentType: "image/jpeg";
}

const JPEG_QUALITY = 88;

/**
 * Runs one uploaded photo through every preset x filter combination.
 * Square crop uses "attention"-based smart cropping (libvips picks the
 * most visually interesting region) rather than a naive center crop.
 */
export async function processImage(input: Buffer): Promise<ProcessedOutput[]> {
  const jobs: Promise<ProcessedOutput>[] = [];

  for (const preset of PRESETS) {
    for (const filter of FILTERS) {
      jobs.push(
        (async () => {
          let pipeline = sharp(input).resize(preset.width, preset.height, {
            fit: "cover",
            position: sharp.strategy.attention,
          });
          pipeline = filter.apply(pipeline);
          const buffer = await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();
          return { presetId: preset.id, filterId: filter.id, buffer, contentType: "image/jpeg" as const };
        })(),
      );
    }
  }

  return Promise.all(jobs);
}
