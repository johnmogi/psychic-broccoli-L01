import { describe, expect, it } from "vitest";
import { main } from "../src/cli.js";

describe("cli", () => {
  it("runs one seed", () => {
    const output = main(["--seed", "42", "--turns", "6"]);
    expect(output).toContain("SEED 42");
    expect(output).toContain("TURNS 6");
    expect(output).toContain("P1 lineage A FIRE");
    expect(output).toContain("P2 lineage A WATER");
    expect(output).toContain("L01 COMPLETE");
    expect(output).toContain("METRICS");
  });

  it("runs a batch", () => {
    const output = main(["batch", "--runs", "4", "--seed-start", "1", "--turns", "4", "--alignment", "sameElement", "--max-jump", "1"]);
    expect(output).toContain("BATCH");
    expect(output).toContain("runs 4");
    expect(output).toContain("sameElement jump 1");
  });

  it("runs the four-way compare", () => {
    const output = main(["compare", "--runs", "4", "--seed-start", "1", "--turns", "4", "--max-evolutions-per-turn", "1"]);
    expect(output).toContain("COMPARE");
    expect(output).toContain("sameColor/+2");
    expect(output).toContain("sameColor/+1");
    expect(output).toContain("sameElement/+2");
    expect(output).toContain("sameElement/+1");
  });
});
