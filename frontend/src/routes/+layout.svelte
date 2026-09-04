<script lang="ts">
  import "../app.css";
  let { children } = $props();
</script>

<svelte:head>
  <meta
    name="description"
    content="Upload your photos and get them optimized for every platform's avatar or profile picture size, with photo-booth style filters. No account needed."
  />
  <meta name="theme-color" content="#FBF6EC" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Pic Perfecto" />
  <meta property="og:title" content="Pic Perfecto" />
  <meta
    property="og:description"
    content="Upload your photos and get them optimized for every platform's avatar or profile picture size, with photo-booth style filters. No account needed."
  />
  <meta property="og:url" content="https://picperfecto.com" />
  <meta name="twitter:card" content="summary" />
</svelte:head>

{@render children()}
