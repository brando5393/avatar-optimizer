<script lang="ts">
  import type { Snippet } from "svelte";
  import type { SessionOutput } from "$lib/api";
  import { filterLabel, presetLabel } from "$lib/preset-labels";

  interface Props {
    sessionToken: string;
    outputs: SessionOutput[];
    actions?: Snippet;
  }
  let { sessionToken, outputs, actions }: Props = $props();

  const groupedOutputs = $derived.by(() => {
    const order: string[] = [];
    const bySource = new Map<string, SessionOutput[]>();
    for (const output of outputs) {
      if (!bySource.has(output.sourceKey)) {
        bySource.set(output.sourceKey, []);
        order.push(output.sourceKey);
      }
      bySource.get(output.sourceKey)!.push(output);
    }
    return order.map((sourceKey, index) => ({
      sourceKey,
      label: `Photo ${index + 1}`,
      outputs: bySource.get(sourceKey)!,
    }));
  });

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(sessionToken);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the code
      // is already shown on screen, so there's nothing more to do here.
    }
  }
</script>

<div class="mx-auto max-w-4xl">
  <div class="rounded-2xl border border-booth/30 bg-booth/5 px-6 py-4 text-center dark:border-booth-light/30 dark:bg-booth-light/10">
    <p class="text-sm font-semibold uppercase tracking-wide text-booth dark:text-booth-light">Your recovery code</p>
    <div class="mt-2 flex items-center justify-center gap-3">
      <code class="font-display text-2xl tracking-wide text-ink dark:text-cream">{sessionToken}</code>
      <button
        type="button"
        onclick={copyCode}
        class="rounded-full border border-booth px-3 py-1 text-sm font-semibold text-booth transition hover:bg-booth hover:text-white dark:border-booth-light dark:text-booth-light dark:hover:bg-booth-light dark:hover:text-night"
      >
        Copy
      </button>
    </div>
    <p class="mt-2 text-sm text-muted">Save this — you'll need it to recover your photos before they expire.</p>
  </div>

  {#each groupedOutputs as group (group.sourceKey)}
    <div class="mt-8">
      <h2 class="font-display text-xl tracking-wide text-ink dark:text-cream">{group.label}</h2>
      <ul class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {#each group.outputs as output (output.presetId + output.filterId)}
          <li class="rounded-xl border border-ink/10 p-3 text-center dark:border-cream/10">
            <img
              src={output.url}
              alt="{presetLabel(output.presetId)}, {filterLabel(output.filterId)} filter"
              class="aspect-square w-full rounded-lg object-cover"
            />
            <p class="mt-2 text-sm font-semibold text-ink dark:text-cream">{presetLabel(output.presetId)}</p>
            <p class="text-xs text-subtle">{filterLabel(output.filterId)}</p>
            <a
              href={output.url}
              download
              class="mt-2 inline-block text-sm font-semibold text-booth underline dark:text-booth-light"
            >
              Download
            </a>
          </li>
        {/each}
      </ul>
    </div>
  {/each}

  {#if actions}
    <div class="mt-8 text-center">
      {@render actions()}
    </div>
  {/if}
</div>
