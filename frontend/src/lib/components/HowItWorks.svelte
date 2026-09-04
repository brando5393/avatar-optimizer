<script lang="ts">
  import FilmStrip from "./FilmStrip.svelte";

  const steps = [
    { n: "01", title: "Upload", body: "Drop in one or more photos, straight from your device." },
    { n: "02", title: "Optimize", body: "We resize, crop, and filter for the platforms you pick." },
    { n: "03", title: "Download", body: "Grab everything now, or save your recovery code for later." },
  ];
</script>

<section aria-labelledby="how-it-works-heading" class="bg-white/50 py-12">
  <FilmStrip />
  <div class="py-8">
    <h2 id="how-it-works-heading" class="text-center font-display text-3xl tracking-wide text-ink">
      How it works
    </h2>
    <ol class="mx-auto mt-10 grid max-w-4xl gap-10 px-6 sm:grid-cols-3">
      {#each steps as step (step.n)}
        <li class="text-center">
          <span class="font-display text-4xl text-flash">{step.n}</span>
          <h3 class="mt-2 text-lg font-semibold text-ink">{step.title}</h3>
          <p class="mt-1 text-sm text-ink/80">{step.body}</p>
        </li>
      {/each}
    </ol>
  </div>
  <FilmStrip />
</section>
