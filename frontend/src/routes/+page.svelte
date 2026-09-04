<script lang="ts">
  import Footer from "$lib/components/Footer.svelte";
  import Header from "$lib/components/Header.svelte";
  import Hero from "$lib/components/Hero.svelte";
  import HowItWorks from "$lib/components/HowItWorks.svelte";
</script>

<svelte:head>
  <title>Pic Perfecto</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
  <Header />
  <main class="flex-1">
    <Hero />
    <HowItWorks />
  </main>
  <Footer />
</div>
