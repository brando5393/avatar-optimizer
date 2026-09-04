import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Hero from "./Hero.svelte";

describe("Hero", () => {
  it("renders an accessible level-one heading with the product name", () => {
    render(Hero);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pic Perfecto");
  });

  it("renders both calls to action as accessible buttons", () => {
    render(Hero);
    expect(screen.getByRole("button", { name: "Upload Photos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recover My Package" })).toBeInTheDocument();
  });

  it("calls onUploadClick when the upload button is clicked", async () => {
    const onUploadClick = vi.fn();
    render(Hero, { onUploadClick });
    await userEvent.click(screen.getByRole("button", { name: "Upload Photos" }));
    expect(onUploadClick).toHaveBeenCalledOnce();
  });

  it("calls onRecoverClick when the recover button is clicked", async () => {
    const onRecoverClick = vi.fn();
    render(Hero, { onRecoverClick });
    await userEvent.click(screen.getByRole("button", { name: "Recover My Package" }));
    expect(onRecoverClick).toHaveBeenCalledOnce();
  });
});
