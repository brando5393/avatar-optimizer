import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, generateUploadUrls, getSession, uploadFileToS3 } from "./api";

describe("generateUploadUrls", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts fileCount and the turnstile token, returning the parsed response", async () => {
    const body = { sessionToken: "ABCD-1234-EFGH-5678", uploads: [] };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => body } as Response);

    const result = await generateUploadUrls(3, "tok");

    expect(result).toEqual(body);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("upload");
    expect(JSON.parse(options?.body as string)).toEqual({ fileCount: 3, turnstileToken: "tok" });
  });

  it("throws an ApiError with the response status on failure", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 429 } as Response);
    await expect(generateUploadUrls(1, "tok")).rejects.toMatchObject({ status: 429 });
  });
});

describe("uploadFileToS3", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts a multipart form with the presigned fields plus the file, file last", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);
    const file = new File(["bytes"], "photo.jpg", { type: "image/jpeg" });

    await uploadFileToS3(file, {
      key: "TOKEN/0",
      url: "https://s3.example/bucket",
      fields: { key: "TOKEN/0", "Content-Type": "image/jpeg", policy: "xyz" },
    });

    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://s3.example/bucket");
    const formData = options?.body as FormData;
    const entries = Array.from(formData.entries()).map(([k]) => k);
    expect(entries[entries.length - 1]).toBe("file");
    expect(formData.get("key")).toBe("TOKEN/0");
  });

  it("throws an ApiError naming the file on a failed upload", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 403 } as Response);
    const file = new File(["bytes"], "photo.jpg", { type: "image/jpeg" });
    await expect(
      uploadFileToS3(file, { key: "k", url: "https://s3.example/bucket", fields: {} }),
    ).rejects.toThrow(/photo\.jpg/);
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("URL-encodes the token as a query param", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ status: "ready", outputs: [] }) } as Response);
    await getSession("ABCD 1234");
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain(encodeURIComponent("ABCD 1234"));
  });

  it("throws ApiError on a non-ok response (e.g. 404 for an unknown code)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response);
    await expect(getSession("BAD-CODE")).rejects.toBeInstanceOf(ApiError);
  });
});
