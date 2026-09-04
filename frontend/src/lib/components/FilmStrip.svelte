<!--
  Decorative film-strip "sprocket hole" divider. Purely visual — hidden from
  assistive tech, never carries meaning on its own. When starCorners is set,
  the two end holes become five-point stars — used only on the strip that
  runs along the very top of the page, so they land at the site frame's top
  corners. The dot opacity lives in the gradient color itself (rather than
  on the container) so the gold star glyphs can render at full strength.
-->
<script lang="ts">
  interface Props {
    starCorners?: boolean;
  }
  let { starCorners = false }: Props = $props();
</script>

<div
  aria-hidden="true"
  class="relative h-3 bg-repeat-x bg-center bg-[radial-gradient(circle,rgba(32,28,24,0.15)_2px,transparent_2.5px)] bg-[length:18px_12px] dark:bg-[radial-gradient(circle,rgba(251,246,236,0.2)_2px,transparent_2.5px)]"
>
  {#if starCorners}
    <span class="absolute left-0 top-1/2 -translate-y-1/2 text-[17px] leading-none text-amber-400 drop-shadow-[0_0_3px_rgba(251,191,36,0.75)]">★</span>
    <span class="absolute right-0 top-1/2 -translate-y-1/2 text-[17px] leading-none text-amber-400 drop-shadow-[0_0_3px_rgba(251,191,36,0.75)]">★</span>
  {/if}
</div>
