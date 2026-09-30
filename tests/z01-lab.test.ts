import { describe, expect, it } from "vitest";
import { routeCommand, scrollbackText } from "../src/z01/commands.js";
import { batchRows, labBatch, labCompare } from "../src/z01/lab.js";

describe("admin stats lab", () => {
  it("routes only the listed terminal commands", () => {
    expect(routeCommand("help").action).toBe("help");
    expect(routeCommand("  RUN ").action).toBe("run");
    expect(routeCommand("batch").action).toBe("batch");
    expect(routeCommand("compare").action).toBe("compare");
    expect(routeCommand("copy logs").action).toBe("copy-logs");
    expect(routeCommand("copy events").action).toBe("copy-events");
    expect(routeCommand("clear").action).toBe("clear");
    expect(routeCommand("evolve").action).toBe("unknown");
    expect(routeCommand("evolve").line).toMatch(/Unknown command/);
    expect(routeCommand("help").line).toMatch(/copy logs/);
  });

  it("formats batch rows from engine stats", () => {
    const stats = labBatch({
      runs: 2,
      seedStart: 1,
      turns: 2,
      alignmentRule: "sameColor",
      maxJump: 2,
      water: true,
      air: false,
    });
    const rows = batchRows(stats);
    expect(rows.map((row) => row.label)).toContain("Average Water");
    expect(rows.find((row) => row.label === "Average Air")?.value).toBe("0.00");
    expect(stats.runs).toBe(2);
    expect(scrollbackText([{ index: 18, eventType: "COMPLETE", text: "complete 4" }])).toBe("018  COMPLETE  complete 4");
  });

  it("compares the four presets on one seed list", () => {
    const compared = labCompare({ runs: 2, seedStart: 3, turns: 2 });
    expect(compared.rows.map((row) => row.name)).toEqual(["sameColor/+2", "sameColor/+1", "sameElement/+2", "sameElement/+1"]);
    expect(new Set(compared.rows.map((row) => row.runs))).toEqual(new Set([2]));
    expect(compared.seeds).toEqual(["3", "4"]);
  });
});
