import { describe, expect, it } from "vitest";
import { playGame } from "../src/engine.js";
import { runBatch } from "../src/compare.js";

function cardIds(seed: string): string[] {
  const state = playGame(seed);
  return [
    ...state.players.flatMap((player) => [...player.lineage, ...player.hand]),
    ...state.roundTable.flatMap((card) => (card ? [card] : [])),
    ...state.altar.minors,
    ...state.veil,
    ...state.deck,
  ].map((card) => card.id);
}

describe("determinism", () => {
  it("repeats structured events for the same seed and config", () => {
    const first = playGame("42", { turnCount: 6, alignmentRule: "sameElement", maxJump: 1 });
    const second = playGame("42", { turnCount: 6, alignmentRule: "sameElement", maxJump: 1 });
    expect(second.events).toEqual(first.events);
  });

  it("keeps each card in one place", () => {
    const ids = cardIds("42");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("repeats a batch for the same seed list", () => {
    const request = { seeds: ["1", "2", "3"], config: { turnCount: 4, alignmentRule: "sameColor" as const, maxJump: 2 as const } };
    expect(runBatch(request)).toEqual(runBatch(request));
  });
});
