<script lang="ts">
  import Footer from "$lib/components/Footer.svelte";
  import Header from "$lib/components/Header.svelte";
  import RecoverFlow from "$lib/components/RecoverFlow.svelte";
</script>

<svelte:head>
  <title>Recover My Package — Pic Perfecto</title>
</svelte:head>

<div class="relative z-10 flex min-h-screen flex-col">
  <Header />
  <main class="flex-1 px-6 py-12">
    <div class="mx-auto max-w-xl text-center">
      <h1 class="font-display text-4xl tracking-wide text-ink dark:text-cream">Recover My Package</h1>
      <p class="mt-3 text-muted">
        Enter the recovery code you were given after uploading to look up your photos.
      </p>
    </div>
    <div class="mt-10">
      <RecoverFlow />
    </div>
  </main>
  <Footer />
</div>
