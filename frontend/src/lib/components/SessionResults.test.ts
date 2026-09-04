import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import SessionResults from "./SessionResults.svelte";

const outputs = [
  { presetId: "discord", filterId: "original", sourceKey: "CODE/0", url: "https://out.example/0-discord.jpg" },
  { presetId: "xbox", filterId: "sepia", sourceKey: "CODE/0", url: "https://out.example/0-xbox.jpg" },
  { presetId: "instagram", filterId: "vivid", sourceKey: "CODE/1", url: "https://out.example/1-instagram.jpg" },
];

describe("SessionResults", () => {
  it("shows the recovery code", () => {
    render(SessionResults, { sessionToken: "CODE-1234", outputs: [] });
    expect(screen.getByText("CODE-1234")).toBeInTheDocument();
  });

  it("groups outputs by source photo, in first-seen order", () => {
    render(SessionResults, { sessionToken: "CODE-1234", outputs });
    const headings = screen.getAllByRole("heading", { level: 2 }).map((el) => el.textContent);
    expect(headings).toEqual(["Photo 1", "Photo 2"]);
  });

  it("shows a labeled download link for each output", () => {
    render(SessionResults, { sessionToken: "CODE-1234", outputs });
    const links = screen.getAllByRole("link", { name: /download/i });
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "https://out.example/0-discord.jpg");
  });

  it("renders nothing under the code when there are no outputs yet", () => {
    render(SessionResults, { sessionToken: "CODE-1234", outputs: [] });
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });
});
