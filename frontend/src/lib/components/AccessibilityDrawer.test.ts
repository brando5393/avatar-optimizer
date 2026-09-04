import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccessibilityDrawer from "./AccessibilityDrawer.svelte";

function mockMatchMedia(prefersDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark") ? prefersDark : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

async function openDrawer() {
  await fireEvent.click(screen.getByRole("button", { name: "Accessibility settings" }));
  await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
}

describe("AccessibilityDrawer", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    mockMatchMedia(false);
  });

  it("renders a closed, labeled trigger button", () => {
    render(AccessibilityDrawer);
    const trigger = screen.getByRole("button", { name: "Accessibility settings" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens an accessible modal dialog labeled by its heading, moving focus inside", async () => {
    render(AccessibilityDrawer);
    await openDrawer();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const heading = screen.getByRole("heading", { level: 2, name: "Accessibility settings" });
    expect(dialog).toHaveAttribute("aria-labelledby", heading.id);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(AccessibilityDrawer);
    await openDrawer();

    await fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Accessibility settings" }));
  });

  it("closes when the backdrop is clicked", async () => {
    const { container } = render(AccessibilityDrawer);
    await openDrawer();

    const backdrop = container.querySelector(".fixed.inset-0");
    expect(backdrop).not.toBeNull();
    await fireEvent.click(backdrop as Element);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("traps Tab focus: wraps from the last element to the first", async () => {
    render(AccessibilityDrawer);
    await openDrawer();

    const dialog = screen.getByRole("dialog");
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, [tabindex]:not([tabindex="-1"])',
    );
    const last = focusable[focusable.length - 1];
    last.focus();

    await fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(focusable[0]);
  });

  it("traps Shift+Tab focus: wraps from the first element to the last", async () => {
    render(AccessibilityDrawer);
    await openDrawer();

    const dialog = screen.getByRole("dialog");
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0].focus();

    await fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(focusable[focusable.length - 1]);
  });

  it("applies the dark class and persists the choice when Dark is selected", async () => {
    render(AccessibilityDrawer);
    await openDrawer();

    await fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(JSON.parse(localStorage.getItem("a11y-prefs") ?? "{}")).toMatchObject({ theme: "dark" });
  });

  it("applies text-size, reduce-motion, underline-links, and high-contrast classes", async () => {
    render(AccessibilityDrawer);
    await openDrawer();

    await fireEvent.click(screen.getByRole("radio", { name: "Larger" }));
    expect(document.documentElement.classList.contains("text-size-xl")).toBe(true);

    await fireEvent.click(screen.getByRole("checkbox", { name: "Reduce motion" }));
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(true);

    await fireEvent.click(screen.getByRole("checkbox", { name: "Always underline links" }));
    expect(document.documentElement.classList.contains("underline-links")).toBe(true);

    await fireEvent.click(screen.getByRole("checkbox", { name: "High-contrast text" }));
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true);
  });

  it("resets every preference and class when Reset to defaults is clicked", async () => {
    render(AccessibilityDrawer);
    await openDrawer();

    await fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    await fireEvent.click(screen.getByRole("checkbox", { name: "High-contrast text" }));
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true);

    await fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));

    expect(document.documentElement.classList.contains("high-contrast")).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(JSON.parse(localStorage.getItem("a11y-prefs") ?? "{}")).toMatchObject({
      theme: "system",
      highContrast: false,
    });
  });
});
