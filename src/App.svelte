<script>
  import Copyright from "./components/Copyright.svelte";
  import CoffeeButton from "./components/CoffeeButton.svelte";
</script>

<header>
  <!-- Create section with an id of appHeader along with an h1 for the app name and an h2 for the tagline styled with tailwind css classes use placeholder text -->
  <section id="appHeader" class="jumbotron">
    <h1 class="text-4xl font-bold text-center">SvelteKit</h1>
    <h2 class="text-2xl text-center">The next big thing in web development</h2>
  </section>
</header>
<main>
  <!--Create a section called appCContent-->
  <section id="appContent">
    <div class="container"></div>
  </section>
</main>
<footer>
  <!-- Use the grid system to make divs for a 3 column footer design -->
  <div class="grid grid-cols-3">
    <div>
      <sub
        >Background Photo by <a
          href="https://unsplash.com/@4dgraphic?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
          class="underline">Alexander Dummer</a
        >
        on
        <a
          href="https://unsplash.com/photos/camera-studio-set-up-aS4Duj2j7r4?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
          class="underline">Unsplash</a
        >
      </sub>
    </div>
    <div>
      <Copyright />
    </div>
    <div>
      <CoffeeButton username="brando5393" />
    </div>
  </div>
</footer>
