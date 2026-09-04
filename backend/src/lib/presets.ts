export interface Preset {
  id: string;
  label: string;
  width: number;
  height: number;
}

/**
 * Square avatar/profile-photo dimensions per platform. Approximate,
 * intentionally — these are easy to tune later and aren't a security or
 * infra concern. One size per platform for the MVP; platforms that support
 * multiple sizes (e.g. Facebook's 170px display vs. larger upload) get the
 * larger recommended upload size, since displays downscale cleanly but
 * never upscale well.
 */
export const PRESETS: Preset[] = [
  { id: "facebook", label: "Facebook", width: 720, height: 720 },
  { id: "instagram", label: "Instagram", width: 320, height: 320 },
  { id: "twitter", label: "Twitter / X", width: 400, height: 400 },
  { id: "discord", label: "Discord", width: 512, height: 512 },
  { id: "xbox", label: "Xbox Gamerpic", width: 512, height: 512 },
  { id: "snapchat", label: "Snapchat", width: 320, height: 320 },
  { id: "linkedin", label: "LinkedIn", width: 400, height: 400 },
  { id: "tiktok", label: "TikTok", width: 200, height: 200 },
];

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}
