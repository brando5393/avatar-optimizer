<!--
  Decorative fixed film-reel rails along the page edges. Purely visual,
  desktop-only so they never crowd content on small screens. Hidden from
  assistive tech. The header's top film strip already stars the frame's top
  two corners, so here only the bottom dot in each rail — the frame's bottom
  two corners — becomes a five-point star; the rest stay plain dots. (The
  rail's top dot sits behind the opaque header anyway, so starring it there
  would be invisible.)
-->
<script lang="ts">
  const dotCount = 36;
  const dots = Array.from({ length: dotCount }, (_, i) => i);
</script>

{#snippet rail()}
  <div class="flex h-full w-full flex-col items-center justify-between py-1">
    {#each dots as i (i)}
      {#if i === dotCount - 1}
        <span class="text-[17px] leading-none text-ink dark:text-cream" style="font-family: 'Segoe UI Symbol', sans-serif;">★</span>
      {:else}
        <span class="h-[5px] w-[5px] rounded-full bg-ink dark:bg-cream"></span>
      {/if}
    {/each}
  </div>
{/snippet}

<div
  aria-hidden="true"
  class="pointer-events-none fixed inset-y-0 left-0 z-0 hidden w-6 opacity-[0.15] dark:opacity-[0.12] lg:block"
>
  {@render rail()}
</div>
<div
  aria-hidden="true"
  class="pointer-events-none fixed inset-y-0 right-0 z-0 hidden w-6 opacity-[0.15] dark:opacity-[0.12] lg:block"
>
  {@render rail()}
</div>
