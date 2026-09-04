<script lang="ts">
  import Footer from "$lib/components/Footer.svelte";
  import Header from "$lib/components/Header.svelte";
  import UploadFlow from "$lib/components/UploadFlow.svelte";
</script>

<svelte:head>
  <title>Upload Photos — Pic Perfecto</title>
</svelte:head>

<div class="relative z-10 flex min-h-screen flex-col">
  <Header />
  <main class="flex-1 px-6 py-12">
    <div class="mx-auto max-w-2xl text-center">
      <h1 class="font-display text-4xl tracking-wide text-ink dark:text-cream">Upload Photos</h1>
      <p class="mt-3 text-muted">
        Choose up to 10 photos. We'll screen them, then resize and filter them for the platforms
        you pick — no account required.
      </p>
    </div>
    <div class="mt-10">
      <UploadFlow />
    </div>
  </main>
  <Footer />
</div>
