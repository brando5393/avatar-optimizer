<script lang="ts">
  import ContactForm from "$lib/components/ContactForm.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import Header from "$lib/components/Header.svelte";
</script>

<svelte:head>
  <title>Contact — Pic Perfecto</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
  <Header />
  <main class="flex-1 px-6 py-12">
    <div class="mx-auto max-w-xl text-center">
      <h1 class="font-display text-4xl tracking-wide text-ink dark:text-cream">Contact</h1>
      <p class="mt-3 text-ink/80 dark:text-cream/80">
        Questions, concerns, or something not working right — send a message and we'll get
        back to you.
      </p>
    </div>
    <div class="mt-10">
      <ContactForm />
    </div>
  </main>
  <Footer />
</div>
