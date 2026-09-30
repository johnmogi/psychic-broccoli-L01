import { describe, expect, it } from "vitest";
import {
  compareSpread,
  diagnose,
  diagnosticSummary,
  higher,
  L02_DIAGNOSTIC_CHECKS,
  type DiagnosticCheck,
} from "../src/z01/diagnostics.js";
import { timelinePositionLabel } from "../src/z01/timeline.js";

const defaultBatch = {
  rank6Rate: 0.116,
  stuckOnAceRate: 0.311,
  averageFinalRank: 2.94,
  averageEvolutions: 2.54,
  waterUse: 1.47,
  airUse: 1.24,
  deckExhaustion: 0,
};

describe("admin stat diagnostics", () => {
  it("flags rank 6 below the lab target", () => {
    expect(diagnose({ rank6Rate: 0.116 })[0]?.status).toBe("watch");
    expect(diagnose({ rank6Rate: 0.116 })[0]?.text).toBe("Watch: rank 6 rate is 11.6%, below the 25% target.");
    expect(diagnose({ rank6Rate: 0.099 })[0]?.status).toBe("problem");
    expect(diagnose({ rank6Rate: 0.1 })[0]?.status).toBe("watch");
    expect(diagnose({ rank6Rate: 0.25 })[0]?.status).toBe("healthy");
  });

  it("treats Water and Air use as healthy above one per run", () => {
    const findings = diagnose({ waterUse: 1.47, airUse: 1.24 });
    expect(findings.map((finding) => finding.status)).toEqual(["healthy", "healthy"]);
    expect(diagnosticSummary(findings)).toEqual(["Healthy: Water and Air effects are being used."]);
    expect(diagnose({ waterUse: 0.1 })[0]?.status).toBe("problem");
    expect(diagnose({ airUse: 0.5 })[0]?.status).toBe("watch");
  });

  it("flags high deck exhaustion as a problem and zero as healthy", () => {
    expect(diagnose({ deckExhaustion: 0.4 })[0]?.status).toBe("problem");
    expect(diagnose({ deckExhaustion: 0.4 })[0]?.text).toMatch(/above the 0.25 ceiling/);
    expect(diagnose({ deckExhaustion: 0.25 })[0]?.status).toBe("watch");
    expect(diagnose({ deckExhaustion: 0 })[0]?.text).toBe("Healthy: deck exhaustion is 0.");
  });

  it("writes the default L02 batch reading", () => {
    expect(diagnosticSummary(diagnose(defaultBatch))).toEqual([
      "Watch: rank 6 rate is 11.6%, below the 25% target.",
      "Watch: 31.1% of players are still on Ace.",
      "Watch: average final rank is 2.94, below the 3.5 target.",
      "Watch: average evolutions are 2.54, below the 3.0 target.",
      "Healthy: Water and Air effects are being used.",
      "Healthy: deck exhaustion is 0.",
    ]);
    expect(higher(0.2, 0.2, 0.35)).toBe("healthy");
  });

  it("names the best rank 6 config and the problem rows", () => {
    const spread = compareSpread([
      { name: "sameColor/+2", signals: { rank6Rate: 0.116, averageFinalRank: 2.94, averageEvolutions: 2.54, waterUse: 1.47, airUse: 1.24 } },
      { name: "sameColor/+1", signals: { rank6Rate: 0, averageFinalRank: 1.59, averageEvolutions: 0.9, waterUse: 1.81, airUse: 1.39 } },
      { name: "sameElement/+2", signals: { rank6Rate: 0.018, averageFinalRank: 1.89, averageEvolutions: 1.2, waterUse: 1.6, airUse: 1.56 } },
      { name: "sameElement/+1", signals: { rank6Rate: 0, averageFinalRank: 1.27, averageEvolutions: 0.4, waterUse: 1.87, airUse: 1.56 } },
    ]);
    const rank6 = spread.extremes.find((item) => item.id === "rank6Rate");
    expect(rank6?.bestName).toBe("sameColor/+2");
    expect(rank6?.bestValue).toBe("11.6%");
    expect(rank6?.worstName).toBe("sameColor/+1");
    expect(spread.problemLines.some((line) => line.startsWith("Problem: sameColor/+2"))).toBe(false);
    expect(spread.problemLines.some((line) => line.includes("sameColor/+1") && line.includes("rank 6 rate"))).toBe(true);
  });

  it("classifies a later-layer check without an L02 rewrite", () => {
    const eclipse: DiagnosticCheck = {
      id: "eclipseRate",
      layer: "Z03",
      label: "eclipse rate",
      classify: (value) => higher(value, 0.5, 0.2),
      describe: (value, status) => `${status} eclipse ${value}`,
    };
    expect(diagnose({ eclipseRate: 0.1 }, [eclipse])[0]?.status).toBe("problem");
    expect(diagnose({ rank6Rate: 0.3 }, [...L02_DIAGNOSTIC_CHECKS, eclipse]).some((finding) => finding.id === "eclipseRate")).toBe(false);
  });

  it("labels the timeline with turn and event counts", () => {
    expect(timelinePositionLabel({ index: 68, turn: null, eventType: "COMPLETE", playerId: null }, 69, 6)).toBe(
      "Turn 6 / 6 · Event 69 / 69 · COMPLETE · —",
    );
    expect(timelinePositionLabel({ index: 0, turn: null, eventType: "SETUP", playerId: null }, 69, 6)).toBe(
      "Turn — / 6 · Event 1 / 69 · SETUP · —",
    );
  });
});
