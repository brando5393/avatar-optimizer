import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Hero from "./Hero.svelte";

describe("Hero", () => {
  it("renders an accessible level-one heading with the product name", () => {
    render(Hero);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Pic Perfecto");
  });

  it("uses the default tagline when none is provided", () => {
    render(Hero);
    expect(
      screen.getByText("Optimize your photos for every platform, in seconds."),
    ).toBeInTheDocument();
  });

  it("renders a custom tagline when provided", () => {
    render(Hero, { tagline: "Custom tagline for testing." });
    expect(screen.getByText("Custom tagline for testing.")).toBeInTheDocument();
    expect(
      screen.queryByText("Optimize your photos for every platform, in seconds."),
    ).not.toBeInTheDocument();
  });
});
