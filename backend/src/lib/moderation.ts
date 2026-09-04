import { DetectModerationLabelsCommand, RekognitionClient } from "@aws-sdk/client-rekognition";

const rekognition = new RekognitionClient({});

export interface ModerationResult {
  isSafe: boolean;
  labels: string[];
}

// Below this confidence, a label is too uncertain to act on — reject only
// on labels Rekognition is reasonably sure about.
const MIN_CONFIDENCE = 75;

/**
 * Screens one image before it's stored or processed. Every upload passes
 * through this — see docs/architecture.md's content-moderation section.
 */
export async function moderateImage(
  imageBytes: Buffer,
  client: Pick<RekognitionClient, "send"> = rekognition,
): Promise<ModerationResult> {
  const result = await client.send(
    new DetectModerationLabelsCommand({
      Image: { Bytes: imageBytes },
      MinConfidence: MIN_CONFIDENCE,
    }),
  );
  const labels = (result.ModerationLabels ?? []).map((label) => label.Name ?? "unknown");
  return { isSafe: labels.length === 0, labels };
}
