<script lang="ts">
  import type { Snippet } from "svelte";
  import Footer from "./Footer.svelte";
  import Header from "./Header.svelte";

  interface Props {
    title: string;
    updated: string;
    children: Snippet;
  }
  let { title, updated, children }: Props = $props();
</script>

<div class="flex min-h-screen flex-col">
  <Header />
  <main class="flex-1 px-6 py-12">
    <article class="mx-auto max-w-2xl">
      <h1 class="font-display text-4xl tracking-wide text-ink dark:text-cream">{title}</h1>
      <p class="mt-2 text-sm text-subtle">Last updated {updated}</p>
      <div class="prose prose-neutral dark:prose-invert mt-8 max-w-none prose-headings:font-display prose-headings:font-normal prose-headings:tracking-wide prose-a:text-booth dark:prose-a:text-booth-light">
        {@render children()}
      </div>
    </article>
  </main>
  <Footer />
</div>
