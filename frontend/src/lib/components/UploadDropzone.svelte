<script lang="ts">
  interface Props {
    files: File[];
    maxFiles?: number;
  }
  let { files = $bindable([]), maxFiles = 10 }: Props = $props();

  let error = $state("");
  let dragOver = $state(false);
  let objectUrls = $state<string[]>([]);

  $effect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    objectUrls = urls;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  });

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming);
    const images = list.filter((file) => file.type.startsWith("image/"));
    const rejectedCount = list.length - images.length;

    const combined = [...files, ...images].slice(0, maxFiles);
    const overflowCount = files.length + images.length - combined.length;

    if (rejectedCount > 0) {
      error = `${rejectedCount} file${rejectedCount === 1 ? " isn't" : "s aren't"} an image and ${rejectedCount === 1 ? "was" : "were"} skipped.`;
    } else if (overflowCount > 0) {
      error = `Only the first ${maxFiles} photos were kept — that's the limit per batch.`;
    } else {
      error = "";
    }

    files = combined;
  }

  function handleInputChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    if (target.files) addFiles(target.files);
    target.value = "";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
  }

  function removeFile(index: number) {
    files = files.filter((_, i) => i !== index);
    error = "";
  }
</script>

<div>
  <label
    for="upload-dropzone-input"
    ondragover={(event) => {
      event.preventDefault();
      dragOver = true;
    }}
    ondragleave={() => (dragOver = false)}
    ondrop={handleDrop}
    class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition {dragOver
      ? 'border-flash bg-flash/5'
      : 'border-ink/25 hover:border-booth dark:border-cream/25 dark:hover:border-booth-light'}"
  >
    <span class="font-display text-2xl tracking-wide text-ink dark:text-cream">
      Drop photos here, or click to choose
    </span>
    <span class="mt-2 text-sm text-subtle">Up to {maxFiles} photos, any common image format</span>
    <input
      id="upload-dropzone-input"
      type="file"
      accept="image/*"
      multiple
      class="sr-only"
      onchange={handleInputChange}
    />
  </label>

  <p aria-live="polite" class="mt-2 min-h-[1.25em] text-sm text-flash-dark dark:text-flash">
    {error}
  </p>

  {#if files.length > 0}
    <ul class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {#each files as file, index (file.name + file.lastModified + index)}
        <li class="relative">
          <img
            src={objectUrls[index]}
            alt="Selected photo: {file.name}"
            class="aspect-square w-full rounded-lg object-cover"
          />
          <button
            type="button"
            onclick={() => removeFile(index)}
            aria-label="Remove {file.name}"
            class="absolute right-1 top-1 rounded-full bg-night/70 p-1 text-white transition hover:bg-flash focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flash-dark"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
