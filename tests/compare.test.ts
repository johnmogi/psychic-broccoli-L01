import { describe, expect, it } from "vitest";
import { compareConfigs, runBatch, tuneConfigs } from "../src/compare.js";
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

  it("reuses one seed list across four configs and several turn lengths", () => {
    const result = tuneConfigs({ runs: 3, seedStart: 2, turnCounts: [4, 6], maxEvolutionsPerTurn: "unlimited" });
    expect(result.seeds).toEqual(seedList(2, 3));
    expect(result.rows).toHaveLength(8);
    expect(new Set(result.rows.map((row) => row.turnCount))).toEqual(new Set([4, 6]));
    expect(result.rows.filter((row) => row.turnCount === 4).map((row) => row.name)).toEqual([
      "sameColor/+2",
      "sameColor/+1",
      "sameElement/+2",
      "sameElement/+1",
    ]);
    const direct = runBatch({
      seeds: result.seeds,
      config: { turnCount: 6, alignmentRule: "sameElement", maxJump: 1, maxEvolutionsPerTurn: "unlimited" },
    });
    const tuned = result.rows.find((row) => row.name === "sameElement/+1" && row.turnCount === 6);
    expect(tuned?.playerRank6Rate).toBe(direct.playerRank6Rate);
    expect(tuned?.rankDistribution.overall[6]).toBe(direct.rankDistribution.overall[6]);
  });
});
