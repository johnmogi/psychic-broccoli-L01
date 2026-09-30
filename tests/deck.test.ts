import { describe, expect, it } from "vitest";
import { createCardDatabase, createL01Pool, elementColor, minor } from "../src/cards.js";
import { playGame } from "../src/engine.js";

describe("deck", () => {
  it("defines Ace through 9, royals, and no tens", () => {
    const database = createCardDatabase();
    const ranks = database.map((card) => card.rank);
    expect(ranks).not.toContain(10);
    expect(database.filter((card) => card.arcana === "minor").map((card) => card.rank)).toEqual(
      expect.arrayContaining([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    );
    expect(database.filter((card) => card.arcana === "major")).toHaveLength(24);
    expect(createL01Pool().every((card) => card.arcana === "minor" && card.rank <= 6)).toBe(true);
  });

  it("uses classic colors", () => {
    expect(elementColor("air")).toBe("black");
    expect(elementColor("fire")).toBe("black");
    expect(elementColor("water")).toBe("red");
    expect(elementColor("earth")).toBe("red");
  });

  it("gives P1 the Fire Ace and P2 the Water Ace, then removes those aces from the deal", () => {
    for (const seed of ["1", "42", "mesahara"]) {
      const state = playGame(seed, { turnCount: 1, maxEvolutionsPerTurn: 0 });
      expect(state.players[0].lineage[0]).toEqual(minor("fire", 1));
      expect(state.players[1].lineage[0]).toEqual(minor("water", 1));
      const dealt = [
        ...state.players.flatMap((player) => player.hand),
        ...state.roundTable.filter((card) => card !== null),
        ...state.deck,
      ];
      expect(dealt.some((card) => card.id === "minor-fire-1" || card.id === "minor-water-1")).toBe(false);
      expect(dealt.some((card) => card.rank > 6 || card.arcana !== "minor")).toBe(false);
      expect(state.roundTable.filter((card) => card !== null)).toHaveLength(3);
      expect(state.players[0].hand).toHaveLength(2);
      expect(state.players[1].hand).toHaveLength(2);
    }
  });

  it("can override the starting aces from config", () => {
    const state = playGame("7", { turnCount: 1, maxEvolutionsPerTurn: 0, startingAces: { P1: "air", P2: "earth" } });
    expect(state.players[0].lineage[0]?.id).toBe("minor-air-1");
    expect(state.players[1].lineage[0]?.id).toBe("minor-earth-1");
  });
});
