import { describe, expect, it } from "vitest";
import { compareConfigs, runBatch } from "../src/compare.js";
import { seedList } from "../src/rng.js";

describe("compare", () => {
  it("reuses one seed list across the four rule presets", () => {
    const result = compareConfigs({ runs: 5, seedStart: 10, turnCount: 4, maxEvolutionsPerTurn: "unlimited" });
    expect(result.seeds).toEqual(seedList(10, 5));
    expect(result.rows.map((row) => row.name)).toEqual(["sameColor/+2", "sameColor/+1", "sameElement/+2", "sameElement/+1"]);
    expect(result.rows.every((row) => row.runs === 5 && row.turnCount === 4)).toBe(true);
    const direct = runBatch({
      seeds: result.seeds,
      config: { turnCount: 4, alignmentRule: "sameColor", maxJump: 2, maxEvolutionsPerTurn: "unlimited" },
    });
    expect(result.rows[0]?.p1Rank6Rate).toBe(direct.p1Rank6Rate);
    expect(result.rows[0]?.averageEvolutions).toBe(direct.averageEvolutions);
  });
});
