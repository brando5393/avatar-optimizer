<script lang="ts">
  import { tick } from "svelte";

  type Theme = "system" | "light" | "dark";
  type TextSize = "default" | "lg" | "xl";

  interface Prefs {
    theme: Theme;
    textSize: TextSize;
    reduceMotion: boolean;
    underlineLinks: boolean;
    highContrast: boolean;
  }

  const DEFAULT_PREFS: Prefs = {
    theme: "system",
    textSize: "default",
    reduceMotion: false,
    underlineLinks: false,
    highContrast: false,
  };

  // Same key the blocking script in app.html reads before first paint.
  const STORAGE_KEY = "a11y-prefs";

  let open = $state(false);
  let prefs = $state<Prefs>({ ...DEFAULT_PREFS });
  let dialogEl: HTMLDivElement | undefined = $state();
  let triggerEl: HTMLButtonElement | undefined = $state();

  function loadPrefs(): Prefs {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PREFS };
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_PREFS };
    }
  }

  function applyPrefs(p: Prefs) {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = p.theme === "dark" || (p.theme === "system" && systemDark);

    root.classList.toggle("dark", isDark);
    root.classList.toggle("text-size-lg", p.textSize === "lg");
    root.classList.toggle("text-size-xl", p.textSize === "xl");
    root.classList.toggle("reduce-motion", p.reduceMotion);
    root.classList.toggle("underline-links", p.underlineLinks);
    root.classList.toggle("high-contrast", p.highContrast);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#1A1310" : "#FBF6EC");

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      // Private browsing / storage disabled — prefs just won't persist.
    }
  }

  function setTheme(value: Theme) {
    prefs = { ...prefs, theme: value };
    applyPrefs(prefs);
  }

  function setTextSize(value: TextSize) {
    prefs = { ...prefs, textSize: value };
    applyPrefs(prefs);
  }

  function setBoolPref(key: "reduceMotion" | "underlineLinks" | "highContrast", value: boolean) {
    prefs = { ...prefs, [key]: value };
    applyPrefs(prefs);
  }

  function resetPrefs() {
    prefs = { ...DEFAULT_PREFS };
    applyPrefs(prefs);
  }

  function getFocusable(container: HTMLElement): HTMLElement[] {
    return Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, [tabindex]:not([tabindex="-1"])',
      ),
    );
  }

  async function openDrawer() {
    prefs = loadPrefs();
    open = true;
    await tick();
    const focusable = dialogEl ? getFocusable(dialogEl) : [];
    (focusable[0] ?? dialogEl)?.focus();
  }

  function closeDrawer() {
    open = false;
    triggerEl?.focus();
  }

  function handleDialogKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== "Tab" || !dialogEl) return;

    const focusable = getFocusable(dialogEl);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

<button
  bind:this={triggerEl}
  type="button"
  onclick={openDrawer}
  aria-haspopup="dialog"
  aria-expanded={open}
  aria-label="Accessibility settings"
  class="rounded-full p-2 text-ink transition hover:bg-ink/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-booth dark:text-cream dark:hover:bg-cream/10 dark:focus-visible:outline-booth-light"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
    <path d="M4 8l8 2 8-2M12 10v4M12 14l-3 7M12 14l3 7" />
  </svg>
</button>

{#if open}
  <div
    class="fixed inset-0 z-40 bg-ink/40 dark:bg-black/60"
    aria-hidden="true"
    onclick={closeDrawer}
  ></div>

  <div
    bind:this={dialogEl}
    role="dialog"
    aria-modal="true"
    aria-labelledby="a11y-drawer-title"
    tabindex="-1"
    onkeydown={handleDialogKeydown}
    class="fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-y-auto bg-cream p-6 shadow-xl dark:bg-night"
  >
    <div class="flex items-center justify-between">
      <h2 id="a11y-drawer-title" class="font-display text-2xl tracking-wide text-ink dark:text-cream">
        Accessibility settings
      </h2>
      <button
        type="button"
        onclick={closeDrawer}
        aria-label="Close accessibility settings"
        class="rounded-full p-2 text-ink transition hover:bg-ink/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-booth dark:text-cream dark:hover:bg-cream/10 dark:focus-visible:outline-booth-light"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <fieldset class="mt-6">
      <legend class="text-sm font-semibold text-ink dark:text-cream">Theme</legend>
      <div class="mt-2 flex flex-col gap-2">
        <label class="flex items-center gap-2 text-sm text-ink dark:text-cream">
          <input class="accent-flash" type="radio" name="a11y-theme" checked={prefs.theme === "system"} onchange={() => setTheme("system")} />
          System
        </label>
        <label class="flex items-center gap-2 text-sm text-ink dark:text-cream">
          <input class="accent-flash" type="radio" name="a11y-theme" checked={prefs.theme === "light"} onchange={() => setTheme("light")} />
          Light
        </label>
        <label class="flex items-center gap-2 text-sm text-ink dark:text-cream">
          <input class="accent-flash" type="radio" name="a11y-theme" checked={prefs.theme === "dark"} onchange={() => setTheme("dark")} />
          Dark
        </label>
      </div>
    </fieldset>

    <fieldset class="mt-6">
      <legend class="text-sm font-semibold text-ink dark:text-cream">Text size</legend>
      <div class="mt-2 flex flex-col gap-2">
        <label class="flex items-center gap-2 text-sm text-ink dark:text-cream">
          <input class="accent-flash" type="radio" name="a11y-text-size" checked={prefs.textSize === "default"} onchange={() => setTextSize("default")} />
          Default
        </label>
        <label class="flex items-center gap-2 text-sm text-ink dark:text-cream">
          <input class="accent-flash" type="radio" name="a11y-text-size" checked={prefs.textSize === "lg"} onchange={() => setTextSize("lg")} />
          Large
        </label>
        <label class="flex items-center gap-2 text-sm text-ink dark:text-cream">
          <input class="accent-flash" type="radio" name="a11y-text-size" checked={prefs.textSize === "xl"} onchange={() => setTextSize("xl")} />
          Larger
        </label>
      </div>
    </fieldset>

    <div class="mt-6 flex flex-col gap-3">
      <label class="flex items-center gap-2 text-sm text-ink dark:text-cream">
        <input
          class="accent-flash"
          type="checkbox"
          checked={prefs.reduceMotion}
          onchange={(e) => setBoolPref("reduceMotion", e.currentTarget.checked)}
        />
        Reduce motion
      </label>
      <label class="flex items-center gap-2 text-sm text-ink dark:text-cream">
        <input
          class="accent-flash"
          type="checkbox"
          checked={prefs.underlineLinks}
          onchange={(e) => setBoolPref("underlineLinks", e.currentTarget.checked)}
        />
        Always underline links
      </label>
      <label class="flex items-center gap-2 text-sm text-ink dark:text-cream">
        <input
          class="accent-flash"
          type="checkbox"
          checked={prefs.highContrast}
          onchange={(e) => setBoolPref("highContrast", e.currentTarget.checked)}
        />
        High-contrast text
      </label>
    </div>

    <button
      type="button"
      onclick={resetPrefs}
      class="mt-8 rounded-full border-2 border-booth px-6 py-2 text-sm font-bold text-booth transition hover:bg-booth hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-booth dark:border-booth-light dark:text-booth-light dark:hover:bg-booth-light dark:hover:text-night"
    >
      Reset to defaults
    </button>
  </div>
{/if}
