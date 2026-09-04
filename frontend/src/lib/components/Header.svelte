<script lang="ts">
  import AccessibilityDrawer from "./AccessibilityDrawer.svelte";
  import CameraMark from "./CameraMark.svelte";
  import FilmStrip from "./FilmStrip.svelte";
</script>

<div class="sticky top-0 z-10 bg-cream dark:bg-night">
  <FilmStrip starCorners />
  <header class="flex items-center justify-between px-6 py-4">
    <a href="/" class="flex items-center gap-3">
      <CameraMark />
      <span class="font-display text-2xl tracking-wide text-ink dark:text-cream">Pic Perfecto</span>
    </a>
    <AccessibilityDrawer />
  </header>
  <FilmStrip />
</div>
