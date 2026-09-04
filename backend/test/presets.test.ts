import { describe, expect, it } from "vitest";
import { findPreset, PRESETS } from "../src/lib/presets";

describe("PRESETS", () => {
  it("has unique ids", () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every preset is a square with positive dimensions", () => {
    for (const preset of PRESETS) {
      expect(preset.width).toBe(preset.height);
      expect(preset.width).toBeGreaterThan(0);
    }
  });
});

describe("findPreset", () => {
  it("finds a known preset by id", () => {
    expect(findPreset("discord")?.label).toBe("Discord");
  });

  it("returns undefined for an unknown id", () => {
    expect(findPreset("myspace")).toBeUndefined();
  });
});
