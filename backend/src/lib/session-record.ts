export type SessionStatus = "pending" | "processing" | "ready" | "rejected" | "error";

export interface SessionOutput {
  sourceKey: string;
  presetId: string;
  filterId: string;
  outputKey: string;
}

export interface SessionRecord {
  sessionToken: string;
  status: SessionStatus;
  originalKeys: string[];
  processedCount: number;
  outputs: SessionOutput[];
  rejectionReason?: string;
  createdAt: string;
  /** DynamoDB TTL attribute — epoch seconds. Mirrors the S3 lifecycle expiry. */
  expiresAt: number;
}

export const RETENTION_SECONDS = 72 * 60 * 60;

export function newExpiresAt(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 1000) + RETENTION_SECONDS;
}
