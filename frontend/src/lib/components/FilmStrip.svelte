<!--
  Decorative film-strip "sprocket hole" divider. Purely visual — hidden from
  assistive tech, never carries meaning on its own. When starCorners is set,
  the two end holes become five-point stars — used only on the strip that
  runs along the very top of the page, so they land at the site frame's top
  corners.
-->
<script lang="ts">
  interface Props {
    starCorners?: boolean;
  }
  let { starCorners = false }: Props = $props();
</script>

<div
  aria-hidden="true"
  class="relative h-3 bg-repeat-x bg-center opacity-[0.15] bg-[radial-gradient(circle,#201C18_2px,transparent_2.5px)] bg-[length:18px_12px] dark:bg-[radial-gradient(circle,#FBF6EC_2px,transparent_2.5px)] dark:opacity-20"
>
  {#if starCorners}
    <span class="absolute left-0 top-1/2 -translate-y-1/2 text-[17px] leading-none text-ink dark:text-cream">★</span>
    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-[17px] leading-none text-ink dark:text-cream">★</span>
  {/if}
</div>
