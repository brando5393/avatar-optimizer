import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Footer from "./Footer.svelte";

describe("Footer", () => {
  it("discloses the 72-hour retention window and no-account requirement", () => {
    render(Footer);
    expect(screen.getByText(/automatically deleted after 72 hours/i)).toBeInTheDocument();
    expect(screen.getByText(/no account needed/i)).toBeInTheDocument();
  });

  it("links to the privacy policy, content policy, terms, and contact page", () => {
    render(Footer);
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Content Policy" })).toHaveAttribute("href", "/content-policy");
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  });
});
