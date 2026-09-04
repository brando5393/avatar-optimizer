<script lang="ts">
  interface Props {
    onUploadClick?: () => void;
    onRecoverClick?: () => void;
  }
  let { onUploadClick = () => {}, onRecoverClick = () => {} }: Props = $props();
</script>

<section class="mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
  <p class="font-display text-sm uppercase tracking-[0.3em] text-booth">Step right up</p>
  <h1 class="mt-3 font-display text-6xl tracking-wide text-ink sm:text-7xl">Pic Perfecto</h1>
  <p class="mx-auto mt-5 max-w-xl text-lg text-ink/80">
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
      class="rounded-full border-2 border-booth px-8 py-3 text-lg font-bold text-booth transition hover:bg-booth hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-booth"
    >
      Recover My Package
    </button>
  </div>
</section>
