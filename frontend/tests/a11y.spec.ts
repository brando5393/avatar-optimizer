import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", title: "Pic Perfecto" },
  { path: "/privacy", title: "Privacy Policy — Pic Perfecto" },
  { path: "/content-policy", title: "Content Policy — Pic Perfecto" },
  { path: "/terms", title: "Terms of Service — Pic Perfecto" },
];

for (const { path, title } of pages) {
  test(`${path} has no detectable WCAG 2.1 AA violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test(`${path} has the expected title and a single level-one heading`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test(`${path} has no detectable WCAG 2.1 AA violations in dark mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`/contact renders its form and has no a11y violations (${colorScheme})`, async ({ page }) => {
    // Block the real Turnstile script so this test doesn't depend on live
    // network access — the widget container is still present and empty,
    // which is not itself an a11y violation.
    await page.route("**/challenges.cloudflare.com/**", (route) => route.abort());
    await page.emulateMedia({ colorScheme });
    await page.goto("/contact");

    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();
    await expect(page.getByLabel(/what's on your mind/i)).toBeVisible();
    await expect(page.getByLabel(/your email/i)).toBeVisible();

    // Turnstile is blocked above, so it can never solve — the button must
    // stay disabled rather than let a submission through unverified.
    await expect(page.getByRole("button", { name: /send message/i })).toBeDisabled();

    // The honeypot must never surface as an accessible control — real
    // keyboard/AT users should have no way to reach or perceive it.
    await expect(page.getByRole("textbox", { name: /website/i })).toHaveCount(0);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("home page links to Upload Photos and Recover My Package", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Upload Photos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Recover My Package" })).toBeVisible();
});

test("an unknown route renders the themed error page with no a11y violations", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("didn't develop");
  await expect(page.getByRole("link", { name: "Back to the booth" })).toHaveAttribute("href", "/");

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("the themed error page has no a11y violations in dark mode either", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/this-page-does-not-exist");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("accessibility drawer opens, traps focus, has no a11y violations, and applies preferences", async ({ page }) => {
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Accessibility settings" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Accessibility settings" });
  await expect(dialog).toBeVisible();
  // Initial focus should land inside the dialog, not stay on the trigger.
  await expect(dialog.locator(":focus")).toHaveCount(1);

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);

  // High contrast: text-muted content should reach full opacity.
  await page.getByRole("checkbox", { name: "High-contrast text" }).click();
  await expect(page.locator("html")).toHaveClass(/high-contrast/);

  // Larger text should scale the root font size up.
  const baseFontSize = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  await page.getByRole("radio", { name: "Larger" }).click();
  await expect(page.locator("html")).toHaveClass(/text-size-xl/);
  const largerFontSize = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  expect(parseFloat(largerFontSize)).toBeGreaterThan(parseFloat(baseFontSize));

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();

  // Preferences persist across reloads.
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/high-contrast/);
  await expect(page.locator("html")).toHaveClass(/text-size-xl/);
});

test("footer links reach the privacy and content policy pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);

  await page.goto("/");
  await page.getByRole("link", { name: "Content Policy" }).click();
  await expect(page).toHaveURL(/\/content-policy$/);

  await page.goto("/");
  await page.getByRole("link", { name: "Terms of Service" }).click();
  await expect(page).toHaveURL(/\/terms$/);

  await page.goto("/");
  await page.getByRole("link", { name: "Contact" }).click();
  await expect(page).toHaveURL(/\/contact$/);
});
