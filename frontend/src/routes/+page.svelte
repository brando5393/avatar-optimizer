<script lang="ts">
  import { goto } from "$app/navigation";
  import Footer from "$lib/components/Footer.svelte";
  import Header from "$lib/components/Header.svelte";
  import Hero from "$lib/components/Hero.svelte";
  import HowItWorks from "$lib/components/HowItWorks.svelte";
</script>

<svelte:head>
  <title>Pic Perfecto</title>
</svelte:head>

<div class="relative z-10 flex min-h-screen flex-col">
  <Header />
  <main class="flex-1">
    <Hero onUploadClick={() => goto("/upload")} onRecoverClick={() => goto("/recover")} />
    <HowItWorks />
  </main>
  <Footer />
</div>
