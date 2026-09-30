import { describe, expect, it } from "vitest";
import { minor } from "../src/cards.js";
import { L01_DEFAULTS } from "../src/config.js";
import { resolveTurn } from "../src/engine.js";
import { isLegalEvolution } from "../src/rules.js";
import type { GameState } from "../src/state.js";

function fixture(patch: Partial<GameState> = {}): GameState {
  return {
    seed: "fixture",
    config: { ...L01_DEFAULTS },
    status: "running",
    completedTurns: 0,
    activePlayerIndex: 0,
    players: [
      { id: "P1", lineage: [minor("fire", 1)], hand: [minor("fire", 3)] },
      { id: "P2", lineage: [minor("water", 1)], hand: [minor("water", 2), minor("earth", 3)] },
    ],
    deck: [minor("air", 4), minor("earth", 5), minor("water", 6)],
    roundTable: [minor("fire", 2), minor("earth", 4), minor("air", 5)],
    pendingCardId: null,
    altar: { minors: [], major: null },
    veil: [],
    events: [],
    ...patch,
  };
}

describe("evolution", () => {
  const ace = minor("fire", 1);

  it("checks color, element, jump, and a higher rank", () => {
    expect(isLegalEvolution(ace, minor("air", 3), { alignmentRule: "sameColor", maxJump: 2 })).toBe(true);
    expect(isLegalEvolution(ace, minor("air", 3), { alignmentRule: "sameElement", maxJump: 2 })).toBe(false);
    expect(isLegalEvolution(ace, minor("fire", 3), { alignmentRule: "sameElement", maxJump: 2 })).toBe(true);
    expect(isLegalEvolution(ace, minor("air", 3), { alignmentRule: "sameColor", maxJump: 1 })).toBe(false);
    expect(isLegalEvolution(ace, minor("fire", 2), { alignmentRule: "sameColor", maxJump: 1 })).toBe(true);
    expect(isLegalEvolution(ace, minor("water", 2), { alignmentRule: "sameColor", maxJump: 2 })).toBe(false);
    expect(isLegalEvolution(ace, minor("fire", 1), { alignmentRule: "sameElement", maxJump: 2 })).toBe(false);
  });

  it("places the offered card on the stack and chains encounter before hand", () => {
    const state = resolveTurn(fixture());
    const lineage = state.players[0].lineage;
    expect(lineage.map((card) => card.id)).toEqual(["minor-fire-1", "minor-fire-2", "minor-fire-3"]);
    const evolutions = state.events.filter((event) => event.type === "EVOLUTION");
    expect(evolutions.map((event) => (event.type === "EVOLUTION" ? event.source : ""))).toEqual(["encounter", "hand"]);
    expect(state.players[0].hand).toHaveLength(0);
    expect(state.pendingCardId).toBeNull();
  });

  it("uses the same legality check for a hand card when the encounter does not match", () => {
    const state = resolveTurn(
      fixture({
        config: { ...L01_DEFAULTS, alignmentRule: "sameElement" },
        roundTable: [minor("air", 2), minor("earth", 4), minor("air", 5)],
      }),
    );
    const evolutions = state.events.filter((event) => event.type === "EVOLUTION");
    expect(evolutions).toHaveLength(1);
    expect(evolutions[0]).toMatchObject({ source: "hand", to: { id: "minor-fire-3" } });
    expect(state.pendingCardId).toBe("minor-air-2");
  });

  it("stops after one evolution when the limit is 1", () => {
    const state = resolveTurn(fixture({ config: { ...L01_DEFAULTS, maxEvolutionsPerTurn: 1 } }));
    expect(state.players[0].lineage.map((card) => card.id)).toEqual(["minor-fire-1", "minor-fire-2"]);
    expect(state.players[0].hand.map((card) => card.id)).toEqual(["minor-fire-3"]);
  });
});
