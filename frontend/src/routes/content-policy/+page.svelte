<script lang="ts">
  import PolicyPage from "$lib/components/PolicyPage.svelte";
</script>

<svelte:head>
  <title>Content Policy — Pic Perfecto</title>
</svelte:head>

<PolicyPage title="Content Policy" updated="September 2026">
  <p>
    Pic Perfecto lets anyone upload photos without an account, so we screen every upload
    to keep the service safe. This page explains what isn't allowed and what happens when
    an upload is flagged.
  </p>

  <h2>Every upload is screened automatically</h2>
  <p>
    Before a photo is stored or processed, it passes through an automated moderation
    check. Uploads that are flagged are rejected outright — they are not stored, not
    processed, and not visible to anyone. There is no manual review queue holding
    rejected images.
  </p>

  <h2>Prohibited content</h2>
  <p>You may not upload photos that:</p>
  <ul>
    <li>Depict or sexualize minors in any way, including child sexual abuse material (CSAM).</li>
    <li>Depict non-consensual sexual content, or intimate images shared without the subject's consent.</li>
    <li>Depict graphic violence, gore, or content intended to shock or traumatize.</li>
    <li>You do not have the rights to use — including photos that infringe someone else's copyright.</li>
    <li>Are uploaded to harass, impersonate, or violate another person's privacy.</li>
    <li>Otherwise violate applicable law.</li>
  </ul>

  <h2>Legal reporting obligations</h2>
  <p>
    Where required by law, we report confirmed instances of child sexual abuse material to
    the relevant authorities (in the United States, the National Center for Missing &amp;
    Exploited Children). This is a legal obligation, not a discretionary choice.
  </p>

  <h2>Enforcement</h2>
  <p>
    A flagged upload is simply rejected — the person uploading is shown an error and
    nothing is retained. Repeated attempts to upload prohibited content from the same
    source may result in that source being blocked from using the service.
  </p>

  <h2>Reporting a concern</h2>
  <p>
    Because uploads are anonymous and automatically deleted after 72 hours, we're not able
    to investigate individual past uploads on request. If you believe the service is being
    misused, contact the address listed on picperfecto.com.
  </p>

  <p>See also our <a href="/privacy">Privacy Policy</a> for how long we keep data and who we share it with.</p>
</PolicyPage>
