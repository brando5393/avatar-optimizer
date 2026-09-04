<script lang="ts">
  import Footer from "$lib/components/Footer.svelte";
  import Header from "$lib/components/Header.svelte";
  import { page } from "$app/stores";
</script>

<svelte:head>
  <title>{$page.status} — Pic Perfecto</title>
</svelte:head>

<div class="relative z-10 flex min-h-screen flex-col">
  <Header />
  <main class="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
    <p class="font-display text-sm uppercase tracking-[0.3em] text-booth dark:text-booth-light">{$page.status}</p>
    <h1 class="mt-3 font-display text-5xl tracking-wide text-ink dark:text-cream">This frame didn't develop</h1>
    <p class="mx-auto mt-4 max-w-md text-lg text-muted">
      {$page.error?.message ?? "That page doesn't exist."}
    </p>
    <a
      href="/"
      class="mt-8 rounded-full bg-flash px-8 py-3 text-lg font-bold text-white shadow-lg shadow-flash/20 transition hover:bg-flash-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flash-dark"
    >
      Back to the booth
    </a>
  </main>
  <Footer />
</div>
