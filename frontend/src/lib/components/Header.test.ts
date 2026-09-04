import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Header from "./Header.svelte";

describe("Header", () => {
  it("links the wordmark back to the home page", () => {
    render(Header);
    expect(screen.getByRole("link", { name: "Pic Perfecto" })).toHaveAttribute("href", "/");
  });
});
