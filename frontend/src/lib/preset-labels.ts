// Mirrors backend/src/lib/presets.ts's ids — display data only, no logic,
// so duplicating rather than sharing a package across frontend/backend is
// the right tradeoff here.
export const PRESET_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter / X",
  discord: "Discord",
  xbox: "Xbox Gamerpic",
  snapchat: "Snapchat",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

export const FILTER_LABELS: Record<string, string> = {
  original: "Original",
  blackAndWhite: "Black & White",
  sepia: "Sepia",
  vivid: "Vivid",
};

export function presetLabel(id: string): string {
  return PRESET_LABELS[id] ?? id;
}

export function filterLabel(id: string): string {
  return FILTER_LABELS[id] ?? id;
}
