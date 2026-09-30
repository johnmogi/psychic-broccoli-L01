import { describe, expect, it } from "vitest";
import { diagnose } from "../src/z01/diagnostics.js";
import type { L02BatchStats } from "../src/l02/metrics.js";
import { futureSlots, orderedDiagnosticLines, presentBatch, presentCompare, rankCharts } from "../src/z01/present.js";
import type { RankRates } from "../src/metrics.js";

function rates(rank6: number, ace = 0.311): RankRates {
  return { 1: ace, 2: 0.16, 3: 0.16, 4: 0.12, 5: 0.13, 6: rank6 };
}

function stats(patch: Partial<L02BatchStats> = {}): L02BatchStats {
  const overall = rates(0.116);
  return {
    runs: 1000,
    turnCount: 6,
    alignmentRule: "sameColor",
    maxJump: 2,
    p1Rank6Rate: 0.122,
    p2Rank6Rate: 0.109,
    playerRank6Rate: 0.116,
    averageFinalRank: 2.94,
    averageEvolutions: 2.54,
    averageCollected: 6,
    averageAltarSends: 13.47,
    averageOverflows: 10.47,
    averageVeil: 11.71,
    averageWater: 1.47,
    averageAir: 1.24,
    averageRecovered: 2.71,
    averageHandSize: 2.3,
    averageDeckExhaustion: 0,
    rankDistribution: { P1: rates(0.122), P2: rates(0.109), overall },
    ...patch,
  };
}

describe("admin lab presentation", () => {
  it("puts problem findings before watch and healthy", () => {
    const lines = orderedDiagnosticLines(diagnose({
      rank6Rate: 0.05,
      waterUse: 1.2,
      airUse: 1.1,
      deckExhaustion: 0.4,
      averageFinalRank: 2.9,
    }));
    expect(lines.map((line) => line.status)).toEqual(["problem", "problem", "watch", "healthy"]);
    expect(lines[0]?.text).toMatch(/^Problem:/);
    expect(lines.at(-1)?.text).toMatch(/Water and Air/);
  });

  it("summarizes the default batch with rank bars and pressure", () => {
    const view = presentBatch(stats());
    expect(view.meters.map((meter) => meter.label)).toEqual([
      "Rank 6",
      "Average final rank",
      "Average evolutions",
      "Stuck on Ace",
      "Altar overflows",
      "Water",
      "Air",
      "Deck exhaustion",
    ]);
    expect(view.findings.map((line) => line.text)).toEqual([
      "Watch: rank 6 rate is 11.6%, below the 25% target.",
      "Watch: 31.1% of players are still on Ace.",
      "Watch: average final rank is 2.94, below the 3.5 target.",
      "Watch: average evolutions are 2.54, below the 3.0 target.",
      "Healthy: Water and Air effects are being used.",
      "Healthy: deck exhaustion is 0.",
    ]);
    expect(view.ranks.map((chart) => chart.seat)).toEqual(["Overall", "P1", "P2"]);
    expect(view.ranks[0]?.bars.map((bar) => bar.label)).toEqual(["A", "2", "3", "4", "5", "6"]);
    expect(view.ranks[0]?.bars[0]?.fraction).toBeCloseTo(0.311);
    expect(view.pressure.map((row) => row.id)).toEqual(["veil", "recovery", "progression"]);
    expect(view.slots).toEqual([]);
    expect(rankCharts(stats().rankDistribution)[1]?.bars[5]?.value).toBe("12.2%");
  });

  it("marks the best rank 6 config and the problem rows", () => {
    const view = presentCompare([
      { name: "sameColor/+2", ...stats() },
      { name: "sameColor/+1", ...stats({ playerRank6Rate: 0, averageFinalRank: 1.59, rankDistribution: { P1: rates(0), P2: rates(0), overall: rates(0, 0.5) } }) },
      { name: "sameElement/+2", ...stats({ playerRank6Rate: 0.018, averageFinalRank: 1.89, rankDistribution: { P1: rates(0.023), P2: rates(0.012), overall: rates(0.018, 0.4) } }) },
      { name: "sameElement/+1", ...stats({ playerRank6Rate: 0, averageFinalRank: 1.27, rankDistribution: { P1: rates(0), P2: rates(0), overall: rates(0, 0.6) } }) },
    ]);
    expect(view.compare.find((row) => row.best)?.name).toBe("sameColor/+2");
    expect(view.compare.filter((row) => row.problem).map((row) => row.name)).toEqual(["sameColor/+1", "sameElement/+2", "sameElement/+1"]);
    expect(view.compare[0]?.cells.find((cell) => cell.id === "rank6Rate")?.fraction).toBeCloseTo(0.116);
    expect(view.findings.some((line) => line.text.startsWith("Problem: sameColor/+1"))).toBe(true);
    expect(view.findings.some((line) => line.text.includes("Best rank 6: sameColor/+2"))).toBe(true);
  });

  it("keeps a slot for a later-layer signal", () => {
    expect(futureSlots({ eclipseRate: 0.4 })).toEqual([{ id: "eclipseRate", label: "Eclipse rate", value: "40.0%", fraction: 0.4 }]);
    expect(futureSlots({ hpLoss: 1.5 })[0]?.value).toBe("1.50");
  });
});
