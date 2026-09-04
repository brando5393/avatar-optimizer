<script lang="ts">
  import { CONTACT_API_URL } from "$lib/config";
  import TurnstileWidget from "./TurnstileWidget.svelte";

  type Status = "idle" | "verifying" | "submitting" | "success" | "error";

  let message = $state("");
  let email = $state("");
  // CSS honeypot: real users never see or reach this field (off-screen,
  // aria-hidden, excluded from tab order). Bots that blindly fill every
  // field they find populate it — see backend isHoneypotFilled.
  let website = $state("");
  let status = $state<Status>("idle");
  let turnstileToken = $state<string | null>(null);
  let widget: TurnstileWidget | undefined = $state();

  function handleVerify(token: string) {
    turnstileToken = token;
    status = "idle";
  }

  function handleExpire() {
    turnstileToken = null;
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!turnstileToken) {
      status = "verifying";
      return;
    }
    status = "submitting";
    try {
      const response = await fetch(CONTACT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, email: email || undefined, website, turnstileToken }),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      status = "success";
      message = "";
      email = "";
    } catch {
      status = "error";
    } finally {
      turnstileToken = null;
      widget?.reset();
    }
  }
</script>

<form onsubmit={handleSubmit} class="mx-auto max-w-xl">
  <div>
    <label for="contact-message" class="block text-sm font-semibold text-ink dark:text-cream">
      What's on your mind?
    </label>
    <textarea
      id="contact-message"
      name="message"
      required
      rows="5"
      bind:value={message}
      class="mt-2 w-full rounded-lg border border-ink/20 bg-white px-4 py-3 text-ink outline-none focus:border-booth focus:ring-2 focus:ring-booth/30 dark:border-cream/20 dark:bg-black/20 dark:text-cream dark:focus:border-booth-light dark:focus:ring-booth-light/30"
    ></textarea>
  </div>

  <div class="mt-4">
    <label for="contact-email" class="block text-sm font-semibold text-ink dark:text-cream">
      Your email (optional, so we can reply)
    </label>
    <input
      id="contact-email"
      name="email"
      type="email"
      bind:value={email}
      class="mt-2 w-full rounded-lg border border-ink/20 bg-white px-4 py-3 text-ink outline-none focus:border-booth focus:ring-2 focus:ring-booth/30 dark:border-cream/20 dark:bg-black/20 dark:text-cream dark:focus:border-booth-light dark:focus:ring-booth-light/30"
    />
  </div>

  <!--
    Honeypot: absolutely positioned off-screen (not display:none/hidden,
    which unsophisticated bots skip), aria-hidden and tabindex=-1 so it
    never reaches screen reader users or keyboard tab order.
  -->
  <div class="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
    <label for="contact-website">Website</label>
    <input
      id="contact-website"
      name="website"
      type="text"
      tabindex="-1"
      autocomplete="off"
      bind:value={website}
    />
  </div>

  <div class="mt-4">
    <TurnstileWidget bind:this={widget} onVerify={handleVerify} onExpire={handleExpire} />
  </div>

  <button
    type="submit"
    disabled={status === "submitting" || !turnstileToken}
    class="mt-6 rounded-full bg-flash px-8 py-3 text-lg font-bold text-white shadow-lg shadow-flash/20 transition hover:bg-flash-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flash-dark disabled:cursor-not-allowed disabled:opacity-60"
  >
    {status === "submitting" ? "Sending…" : "Send message"}
  </button>

  <p aria-live="polite" class="mt-4 text-sm">
    {#if status === "verifying"}
      <span class="text-subtle">Please complete the verification above first.</span>
    {:else if status === "success"}
      <span class="text-booth dark:text-booth-light">Sent — thanks for reaching out.</span>
    {:else if status === "error"}
      <span class="text-flash-dark dark:text-flash">Something went wrong sending that. Please try again.</span>
    {/if}
  </p>
</form>
