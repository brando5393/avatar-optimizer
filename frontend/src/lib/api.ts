import { GENERATE_UPLOAD_URL_API, GET_SESSION_API } from "./config";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface PresignedUpload {
  key: string;
  url: string;
  fields: Record<string, string>;
}

export interface GenerateUploadUrlsResponse {
  sessionToken: string;
  uploads: PresignedUpload[];
}

export async function generateUploadUrls(
  fileCount: number,
  turnstileToken: string,
): Promise<GenerateUploadUrlsResponse> {
  const response = await fetch(GENERATE_UPLOAD_URL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileCount, turnstileToken }),
  });
  if (!response.ok) {
    throw new ApiError(`Could not start the upload (${response.status})`, response.status);
  }
  return response.json();
}

/** Uploads directly to S3 via the presigned POST — never through our own backend. */
export async function uploadFileToS3(file: File, upload: PresignedUpload): Promise<void> {
  const formData = new FormData();
  for (const [key, value] of Object.entries(upload.fields)) {
    formData.append(key, value);
  }
  // S3 expects the file field last, after every policy field.
  formData.append("file", file);

  const response = await fetch(upload.url, { method: "POST", body: formData });
  if (!response.ok) {
    throw new ApiError(`Upload failed for ${file.name} (${response.status})`, response.status);
  }
}

export type SessionStatus = "pending" | "processing" | "ready" | "rejected" | "error";

export interface SessionOutput {
  presetId: string;
  filterId: string;
  sourceKey: string;
  url: string;
}

export interface GetSessionResponse {
  status: SessionStatus;
  rejectionReason?: string;
  outputs: SessionOutput[];
}

export async function getSession(sessionToken: string): Promise<GetSessionResponse> {
  const response = await fetch(`${GET_SESSION_API}?token=${encodeURIComponent(sessionToken)}`);
  if (!response.ok) {
    throw new ApiError(`Could not look up that recovery code (${response.status})`, response.status);
  }
  return response.json();
}
