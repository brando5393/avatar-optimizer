<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { TURNSTILE_SITE_KEY } from "$lib/config";

  interface Props {
    onVerify: (token: string) => void;
    onExpire?: () => void;
  }
  let { onVerify, onExpire = () => {} }: Props = $props();

  let widgetContainer: HTMLDivElement | undefined = $state();
  let widgetId: string | undefined;

  function renderWidget() {
    if (!window.turnstile || !widgetContainer) return;
    widgetId = window.turnstile.render(widgetContainer, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: onVerify,
      "expired-callback": onExpire,
    });
  }

  onMount(() => {
    if (window.turnstile) {
      renderWidget();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = "true";
      script.addEventListener("load", renderWidget);
      document.head.appendChild(script);
    } else {
      existing.addEventListener("load", renderWidget);
    }
  });

  onDestroy(() => {
    if (typeof window !== "undefined" && window.turnstile && widgetId) window.turnstile.reset(widgetId);
  });

  /** Called by the parent form after a submit attempt (success or failure) — tokens are single-use. */
  export function reset() {
    if (typeof window !== "undefined" && window.turnstile && widgetId) window.turnstile.reset(widgetId);
  }
</script>

<div bind:this={widgetContainer}></div>
