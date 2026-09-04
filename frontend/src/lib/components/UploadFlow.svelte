<script lang="ts">
  import { ApiError, generateUploadUrls, getSession, uploadFileToS3, type GetSessionResponse } from "$lib/api";
  import SessionResults from "./SessionResults.svelte";
  import TurnstileWidget from "./TurnstileWidget.svelte";
  import UploadDropzone from "./UploadDropzone.svelte";

  interface Props {
    pollIntervalMs?: number;
    maxPollAttempts?: number;
  }
  let { pollIntervalMs = 3000, maxPollAttempts = 40 }: Props = $props();

  type Phase = "selecting" | "verifying" | "uploading" | "processing" | "ready" | "rejected" | "error";

  let files = $state<File[]>([]);
  let turnstileToken = $state<string | null>(null);
  let widget: TurnstileWidget | undefined = $state();
  let phase = $state<Phase>("selecting");
  let errorMessage = $state("");
  let uploadedCount = $state(0);
  let sessionToken = $state("");
  let session = $state<GetSessionResponse | null>(null);

  function handleVerify(token: string) {
    turnstileToken = token;
    if (phase === "verifying") phase = "selecting";
  }

  function handleExpire() {
    turnstileToken = null;
  }

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function pollSession(): Promise<void> {
    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      const result = await getSession(sessionToken);
      if (result.status !== "pending" && result.status !== "processing") {
        session = result;
        phase = result.status;
        return;
      }
      if (attempt < maxPollAttempts - 1) await wait(pollIntervalMs);
    }
    phase = "error";
    errorMessage = "This is taking longer than expected. Try recovering your package in a minute using the code below.";
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (files.length === 0) return;
    if (!turnstileToken) {
      phase = "verifying";
      return;
    }

    const tokenToUse = turnstileToken;
    turnstileToken = null;
    widget?.reset();

    phase = "uploading";
    errorMessage = "";
    uploadedCount = 0;

    try {
      const { sessionToken: newSessionToken, uploads } = await generateUploadUrls(files.length, tokenToUse);
      sessionToken = newSessionToken;
      for (let i = 0; i < files.length; i++) {
        await uploadFileToS3(files[i], uploads[i]);
        uploadedCount += 1;
      }
      phase = "processing";
      await pollSession();
    } catch (err) {
      phase = "error";
      errorMessage = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
    }
  }

  function startOver() {
    files = [];
    session = null;
    sessionToken = "";
    errorMessage = "";
    phase = "selecting";
  }
</script>

{#if phase === "selecting" || phase === "verifying" || phase === "uploading"}
  <form onsubmit={handleSubmit} class="mx-auto max-w-2xl">
    <UploadDropzone bind:files />

    <div class="mt-4">
      <TurnstileWidget bind:this={widget} onVerify={handleVerify} onExpire={handleExpire} />
    </div>

    <button
      type="submit"
      disabled={files.length === 0 || !turnstileToken || phase === "uploading"}
      class="mt-6 rounded-full bg-flash px-8 py-3 text-lg font-bold text-white shadow-lg shadow-flash/20 transition hover:bg-flash-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flash-dark disabled:cursor-not-allowed disabled:opacity-60"
    >
      {phase === "uploading" ? "Uploading…" : "Send to the booth"}
    </button>

    <p aria-live="polite" class="mt-4 text-sm">
      {#if phase === "verifying"}
        <span class="text-subtle">Please complete the verification above first.</span>
      {:else if phase === "uploading"}
        <span class="text-subtle">Uploading {uploadedCount} of {files.length}…</span>
      {/if}
    </p>
  </form>
{:else if phase === "processing"}
  <div class="mx-auto max-w-xl text-center" aria-live="polite">
    <p class="font-display text-2xl tracking-wide text-ink dark:text-cream">Developing your photos…</p>
    <p class="mt-2 text-muted">Screening and optimizing — this usually takes under a minute.</p>
  </div>
{:else if phase === "ready"}
  <SessionResults sessionToken={sessionToken} outputs={session?.outputs ?? []}>
    {#snippet actions()}
      <button
        type="button"
        onclick={startOver}
        class="rounded-full border-2 border-booth px-6 py-2 font-bold text-booth transition hover:bg-booth hover:text-white dark:border-booth-light dark:text-booth-light dark:hover:bg-booth-light dark:hover:text-night"
      >
        Start another batch
      </button>
    {/snippet}
  </SessionResults>
{:else if phase === "rejected"}
  <div class="mx-auto max-w-xl text-center">
    <p class="font-display text-2xl tracking-wide text-ink dark:text-cream">We couldn't process this batch</p>
    <p class="mt-2 text-muted">{session?.rejectionReason ?? "One or more photos didn't pass our content screening."}</p>
    <button
      type="button"
      onclick={startOver}
      class="mt-6 rounded-full border-2 border-booth px-6 py-2 font-bold text-booth transition hover:bg-booth hover:text-white dark:border-booth-light dark:text-booth-light dark:hover:bg-booth-light dark:hover:text-night"
    >
      Try again
    </button>
  </div>
{:else if phase === "error"}
  <div class="mx-auto max-w-xl text-center" aria-live="polite">
    <p class="font-display text-2xl tracking-wide text-ink dark:text-cream">Something went wrong</p>
    <p class="mt-2 text-flash-dark dark:text-flash">{errorMessage}</p>
    {#if sessionToken}
      <p class="mt-2 text-sm text-muted">Your recovery code, if you'd like to try looking it up: <code>{sessionToken}</code></p>
    {/if}
    <button
      type="button"
      onclick={startOver}
      class="mt-6 rounded-full border-2 border-booth px-6 py-2 font-bold text-booth transition hover:bg-booth hover:text-white dark:border-booth-light dark:text-booth-light dark:hover:bg-booth-light dark:hover:text-night"
    >
      Try again
    </button>
  </div>
{/if}
