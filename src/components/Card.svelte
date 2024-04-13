<!-- Card.svelte -->
<script>
    export let title = "";
    export let content = "";
</script>

<div class="card shadow-md rounded-md overflow-hidden">
    {#if title}
        <div class="card-header bg-gray-200 py-2 px-4">
            <h2 class="text-lg font-semibold">{title}</h2>
        </div>
    {/if}
    <div class="card-content p-4">
        <p class="text-gray-700">{content}</p>
    </div>
</div>
