import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import HowItWorks from "./HowItWorks.svelte";

describe("HowItWorks", () => {
  it("renders an accessible level-two heading", () => {
    render(HowItWorks);
    expect(screen.getByRole("heading", { level: 2, name: "How it works" })).toBeInTheDocument();
  });

  it("renders exactly three steps, in order, as a list", () => {
    render(HowItWorks);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Upload");
    expect(items[1]).toHaveTextContent("Optimize");
    expect(items[2]).toHaveTextContent("Download");
  });
});
