<script lang="ts">
  import TrustBadges from "./TrustBadges.svelte";

  interface Props {
    onUploadClick?: () => void;
    onRecoverClick?: () => void;
  }
  let { onUploadClick = () => {}, onRecoverClick = () => {} }: Props = $props();
</script>

<section class="relative overflow-hidden">
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
  >
    <div class="h-72 w-72 rounded-full bg-flash/25 blur-3xl sm:h-96 sm:w-96"></div>
  </div>

  <div class="relative mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
    <p class="font-display text-sm uppercase tracking-[0.3em] text-booth dark:text-booth-light">Step right up</p>
    <h1 class="mt-3 font-display text-6xl tracking-wide text-ink dark:text-cream sm:text-7xl">Pic Perfecto</h1>
    <p class="mx-auto mt-5 max-w-xl text-lg text-muted">
      Upload your photos, run them through our booth of filters and crops, and
      walk away with perfectly sized shots for every platform — no account
      required.
    </p>
    <div class="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <button
        type="button"
        onclick={onUploadClick}
        class="rounded-full bg-flash px-8 py-3 text-lg font-bold text-white shadow-lg shadow-flash/20 transition hover:bg-flash-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flash-dark"
      >
        Upload Photos
      </button>
      <button
        type="button"
        onclick={onRecoverClick}
        class="rounded-full border-2 border-booth px-8 py-3 text-lg font-bold text-booth transition hover:bg-booth hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-booth dark:border-booth-light dark:text-booth-light dark:hover:bg-booth-light dark:hover:text-night dark:focus-visible:outline-booth-light"
      >
        Recover My Package
      </button>
    </div>

    <TrustBadges />
  </div>
</section>
