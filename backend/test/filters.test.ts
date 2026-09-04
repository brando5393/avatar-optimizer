import { describe, expect, it } from "vitest";
import { FILTERS, findFilter } from "../src/lib/filters";

describe("FILTERS", () => {
  it("has unique ids", () => {
    const ids = FILTERS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes an original (identity) filter", () => {
    const original = findFilter("original");
    expect(original).toBeDefined();
  });
});

describe("findFilter", () => {
  it("finds a known filter by id", () => {
    expect(findFilter("sepia")?.label).toBe("Sepia");
  });

  it("returns undefined for an unknown id", () => {
    expect(findFilter("vhs-static")).toBeUndefined();
  });
});
