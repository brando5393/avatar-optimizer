import type { Sharp } from "sharp";

export type FilterId = "original" | "blackAndWhite" | "sepia" | "vivid";

export interface Filter {
  id: FilterId;
  label: string;
  apply: (image: Sharp) => Sharp;
}

// Classic sepia recombination matrix (standard photographic sepia weights).
const SEPIA_MATRIX: [[number, number, number], [number, number, number], [number, number, number]] = [
  [0.393, 0.769, 0.189],
  [0.349, 0.686, 0.168],
  [0.272, 0.534, 0.131],
];

export const FILTERS: Filter[] = [
  { id: "original", label: "Original", apply: (image) => image },
  { id: "blackAndWhite", label: "Black & White", apply: (image) => image.grayscale() },
  { id: "sepia", label: "Sepia", apply: (image) => image.recomb(SEPIA_MATRIX) },
  { id: "vivid", label: "Vivid", apply: (image) => image.modulate({ saturation: 1.4, brightness: 1.03 }) },
];

export function findFilter(id: string): Filter | undefined {
  return FILTERS.find((filter) => filter.id === id);
}
