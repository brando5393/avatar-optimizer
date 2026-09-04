<script lang="ts">
  interface Props {
    tagline?: string;
  }
  let { tagline = "Optimize your photos for every platform, in seconds." }: Props = $props();
</script>

<section class="mx-auto max-w-3xl px-6 py-16 text-center">
  <h1 class="text-4xl font-bold tracking-tight">Pic Perfecto</h1>
  <p class="mt-4 text-lg text-gray-600">{tagline}</p>
</section>
