import { describe, expect, it } from "vitest";
import { formatLog } from "../src/events.js";
import { playGame } from "../src/engine.js";

describe("altar and veil", () => {
  it("moves an unused encounter to the altar on the next turn and overflows the oldest minor", () => {
    const state = playGame("altar", { turnCount: 5, maxEvolutionsPerTurn: 0 });
    const altar = state.events.filter((event) => event.type === "TO_ALTAR");
    const veil = state.events.filter((event) => event.type === "TO_VEIL");
    expect(altar).toHaveLength(4);
    expect(veil).toHaveLength(1);
    expect(altar[0]?.type).toBe("TO_ALTAR");
    expect(veil[0]?.type).toBe("TO_VEIL");
    if (altar[0]?.type === "TO_ALTAR" && veil[0]?.type === "TO_VEIL") {
      expect(veil[0].card.id).toBe(altar[0].card.id);
    }
    expect(state.altar.minors).toHaveLength(3);
    expect(state.veil).toHaveLength(1);
    expect(state.altar.major).toBeNull();
  });

  it("leaves empty slots and records deck exhaustion", () => {
    const state = playGame("empty", { turnCount: 20, maxEvolutionsPerTurn: 0 });
    const exhausted = state.events.filter((event) => event.type === "DECK_EXHAUSTED");
    expect(exhausted.length).toBeGreaterThan(0);
    expect(state.deck).toHaveLength(0);
    expect(state.roundTable.some((card) => card === null)).toBe(true);
    expect(formatLog(state.events)).toContain("DECK EXHAUSTED");
  });
});
