<script>
    export let title = "Section Title";
    export let subTitle = "";
</script>

<!-- Utilize Tailwind CSS classes -->
<div>
    <h2 class="text-2xl font-bold mb-2">{title}</h2>
    {#if subTitle}
        <h3 class="text-lg text-gray-700 ml-2">{subTitle}</h3>
    {/if}
</div>
