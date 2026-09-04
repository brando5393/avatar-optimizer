<script lang="ts">
  import PolicyPage from "$lib/components/PolicyPage.svelte";
</script>

<svelte:head>
  <title>Privacy Policy — Pic Perfecto</title>
</svelte:head>

<PolicyPage title="Privacy Policy" updated="September 2026">
  <p>
    Pic Perfecto ("we", "us") optimizes photos you upload — resizing, cropping, and
    filtering them for the platforms you choose. This page explains what we collect,
    why, and for how long.
  </p>

  <h2>What we collect</h2>
  <ul>
    <li><strong>The photos you upload</strong>, and the optimized versions we generate from them.</li>
    <li>
      <strong>Your IP address</strong>, only transiently, to enforce upload rate limits and
      block automated abuse. We do not store a persistent log tied to your identity.
    </li>
    <li>
      A <strong>recovery code</strong> we generate for your batch, so you can come back and
      finish downloading. It is a random code, not derived from anything about you.
    </li>
  </ul>
  <p>We do not require an account, an email address, or any other personal information to use the service.</p>

  <h2>How long we keep it</h2>
  <p>
    Everything — your uploaded originals, the optimized outputs, and the recovery code
    linking them — is automatically and permanently deleted <strong>72 hours</strong> after
    upload. This isn't a policy we have to remember to enforce; it's built into how the
    storage itself expires.
  </p>

  <h2>Content screening</h2>
  <p>
    Every photo you upload is automatically screened for prohibited content before it is
    stored or processed, using an automated moderation service. See our
    <a href="/content-policy">Content Policy</a> for details on what's prohibited and what
    happens if an upload is flagged.
  </p>

  <h2>Who else sees your data</h2>
  <p>We use a small number of infrastructure providers to run the service. None of them are permitted to use your photos for anything other than providing the service to you:</p>
  <ul>
    <li><strong>Amazon Web Services</strong> — storage and processing of your photos, and automated content moderation.</li>
    <li><strong>Cloudflare</strong> — bot verification on the upload form (Turnstile), which does not see your photos.</li>
  </ul>

  <h2>Cookies &amp; tracking</h2>
  <p>
    We don't use advertising or analytics cookies. Anything stored in your browser is
    there only to make the site work (for example, remembering your recovery code locally
    so you don't have to retype it).
  </p>

  <h2>Children's privacy</h2>
  <p>Pic Perfecto is not directed at children under 13, and we do not knowingly collect data from them.</p>

  <h2>Changes to this policy</h2>
  <p>If this policy changes materially, we'll update the date at the top of this page.</p>

  <h2>Contact</h2>
  <p>Questions about this policy can be sent through our <a href="/contact">contact page</a>.</p>
</PolicyPage>
