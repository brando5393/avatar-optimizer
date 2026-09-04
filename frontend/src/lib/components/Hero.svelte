<script lang="ts">
  import TrustBadges from "./TrustBadges.svelte";

  interface Props {
    onUploadClick?: () => void;
    onRecoverClick?: () => void;
  }
  let { onUploadClick = () => {}, onRecoverClick = () => {} }: Props = $props();
</script>

<section class="relative overflow-hidden">
  <!--
    Decorative flowing film strip along the hero's left edge. Purely visual,
    sits behind the glow and copy — hidden from assistive tech.
  -->
  <div
    aria-hidden="true"
    class="pointer-events-none absolute -left-10 top-[-15%] h-[130%] w-20 -rotate-6 opacity-[0.07] dark:opacity-[0.1] sm:-left-4 sm:w-28"
  >
    <div class="h-full w-full rounded-[2rem] bg-ink dark:bg-cream"></div>
    <div class="absolute inset-y-0 left-2.5 flex w-3 flex-col justify-between py-6 sm:left-3.5">
      {#each Array.from({ length: 18 }) as _, i (i)}
        <div class="h-3 w-3 rounded-full bg-cream dark:bg-night"></div>
      {/each}
    </div>
    <div class="absolute inset-y-0 right-2.5 flex w-3 flex-col justify-between py-6 sm:right-3.5">
      {#each Array.from({ length: 18 }) as _, i (i)}
        <div class="h-3 w-3 rounded-full bg-cream dark:bg-night"></div>
      {/each}
    </div>
  </div>

  <!--
    Decorative vintage flash-bulb camera along the hero's right edge. Purely
    visual, mirrors the film strip on the left — hidden from assistive tech.
  -->
  <svg
    aria-hidden="true"
    viewBox="0 0 220 180"
    fill="none"
    stroke="currentColor"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="pointer-events-none absolute -right-12 bottom-[-10%] h-[75%] w-56 rotate-6 text-ink opacity-[0.08] dark:text-cream dark:opacity-[0.12] sm:-right-6 sm:h-[85%] sm:w-72"
  >
    <rect x="20" y="70" width="140" height="80" rx="12" />
    <rect x="35" y="55" width="110" height="18" rx="4" />
    <rect x="75" y="38" width="35" height="20" rx="4" />
    <circle cx="150" cy="64" r="4" fill="currentColor" stroke="none" />
    <circle cx="90" cy="110" r="32" />
    <circle cx="90" cy="110" r="21" />
    <circle cx="90" cy="110" r="9" fill="currentColor" stroke="none" />
    <path d="M155 88 L192 42" />
    <path d="M170 22 L207 12 L207 56 L170 66 Z" />
    <circle cx="187" cy="37" r="15" class="text-flash" stroke="currentColor" />
    <path d="M187 17 L187 9M204 25 L212 20M204 50 L212 55M170 34 L162 30M170 42 L162 46" />
  </svg>

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
