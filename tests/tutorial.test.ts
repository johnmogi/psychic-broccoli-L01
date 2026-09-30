import { describe, expect, it } from "vitest";
import { playGoldenTutorial } from "../src/tutorial.js";

describe("golden tutorial", () => {
  it("shows a color change and finishes both players on rank 6", () => {
    const state = playGoldenTutorial();
    const again = playGoldenTutorial();
    expect(again.events).toEqual(state.events);
    expect(state.players[0].lineage.map((card) => card.id)).toEqual([
      "minor-fire-1",
      "minor-air-3",
      "minor-fire-4",
      "minor-air-6",
    ]);
    expect(state.players[1].lineage.at(-1)?.id).toBe("minor-water-6");
    expect(state.events.some((event) => event.type === "EVOLUTION" && event.alignmentMatch === "color")).toBe(true);
    expect(state.events.some((event) => event.type === "EVOLUTION" && event.source === "encounter")).toBe(true);
    expect(state.events.some((event) => event.type === "EVOLUTION" && event.source === "hand")).toBe(true);
  });
});
