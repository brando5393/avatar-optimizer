<script lang="ts">
  import { ApiError, getSession, type GetSessionResponse } from "$lib/api";
  import SessionResults from "./SessionResults.svelte";

  type Phase = "entering" | "looking-up" | "found" | "not-found" | "error";

  let code = $state("");
  let phase = $state<Phase>("entering");
  let errorMessage = $state("");
  let session = $state<GetSessionResponse | null>(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    phase = "looking-up";
    errorMessage = "";
    try {
      const result = await getSession(trimmed);
      if (result.status === "ready") {
        session = result;
        phase = "found";
      } else if (result.status === "rejected") {
        session = result;
        errorMessage = result.rejectionReason ?? "One or more photos didn't pass our content screening.";
        phase = "not-found";
      } else {
        errorMessage = "That package is still being prepared. Try again in a moment.";
        phase = "not-found";
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        errorMessage = "We couldn't find a package with that code. It may have expired or been mistyped.";
        phase = "not-found";
      } else {
        errorMessage = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        phase = "error";
      }
    }
  }

  function startOver() {
    code = "";
    session = null;
    errorMessage = "";
    phase = "entering";
  }
</script>

{#if phase === "found" && session}
  <SessionResults sessionToken={code.trim()} outputs={session.outputs}>
    {#snippet actions()}
      <button
        type="button"
        onclick={startOver}
        class="rounded-full border-2 border-booth px-6 py-2 font-bold text-booth transition hover:bg-booth hover:text-white dark:border-booth-light dark:text-booth-light dark:hover:bg-booth-light dark:hover:text-night"
      >
        Look up another code
      </button>
    {/snippet}
  </SessionResults>
{:else}
  <form onsubmit={handleSubmit} class="mx-auto max-w-md">
    <label for="recovery-code" class="block text-sm font-semibold text-ink dark:text-cream">
      Recovery code
    </label>
    <input
      id="recovery-code"
      name="code"
      type="text"
      autocomplete="off"
      spellcheck="false"
      required
      bind:value={code}
      placeholder="e.g. ABCD-1234-EFGH-5678"
      class="mt-2 w-full rounded-lg border border-ink/20 bg-white px-4 py-3 text-center font-display text-lg tracking-wide text-ink outline-none focus:border-booth focus:ring-2 focus:ring-booth/30 dark:border-cream/20 dark:bg-black/20 dark:text-cream dark:focus:border-booth-light dark:focus:ring-booth-light/30"
    />

    <button
      type="submit"
      disabled={code.trim() === "" || phase === "looking-up"}
      class="mt-6 w-full rounded-full bg-flash px-8 py-3 text-lg font-bold text-white shadow-lg shadow-flash/20 transition hover:bg-flash-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flash-dark disabled:cursor-not-allowed disabled:opacity-60"
    >
      {phase === "looking-up" ? "Looking up…" : "Recover my package"}
    </button>

    <p aria-live="polite" class="mt-4 text-center text-sm">
      {#if phase === "not-found"}
        <span class="text-flash-dark dark:text-flash">{errorMessage}</span>
      {:else if phase === "error"}
        <span class="text-flash-dark dark:text-flash">{errorMessage}</span>
      {/if}
    </p>
  </form>
{/if}
