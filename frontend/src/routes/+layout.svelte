<script lang="ts">
  import "../app.css";
  import PageBackdrop from "$lib/components/PageBackdrop.svelte";
  let { children } = $props();
</script>

<svelte:head>
  <meta
    name="description"
    content="Upload your photos and get them optimized for every platform's avatar or profile picture size, with photo-booth style filters. No account needed."
  />
  <meta name="theme-color" content="#FBF6EC" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#1A1310" media="(prefers-color-scheme: dark)" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Pic Perfecto" />
  <meta property="og:title" content="Pic Perfecto" />
  <meta
    property="og:description"
    content="Upload your photos and get them optimized for every platform's avatar or profile picture size, with photo-booth style filters. No account needed."
  />
  <meta property="og:url" content="https://picperfecto.com" />
  <meta property="og:image" content="https://picperfecto.com/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://picperfecto.com/og-image.png" />
</svelte:head>

<PageBackdrop />
{@render children()}
