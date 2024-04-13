<!-- ImageDisplay.svelte -->
<script>
    export let imageUrl;
    export let id;
</script>

<label class="block mb-2" for={id}>
    <img
        src={imageUrl}
        alt="Uploaded Image"
        class="max-w-full h-auto mb-2"
        {id}
    />
</label>
