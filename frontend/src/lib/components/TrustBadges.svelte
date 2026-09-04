<script lang="ts">
  const badges = [
    "Auto-deleted after 72 hours",
    "No account needed",
    "Every upload screened for safety",
  ];
</script>

<ul class="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
  {#each badges as badge (badge)}
    <li
      class="rounded-full border border-ink/15 bg-white/60 px-4 py-1.5 text-ink/80 dark:border-cream/20 dark:bg-black/20 dark:text-cream/80"
    >
      {badge}
    </li>
  {/each}
</ul>
