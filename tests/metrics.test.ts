import { describe, expect, it } from "vitest";
import { playGame } from "../src/engine.js";
import { runBatch } from "../src/compare.js";
import { metricsFromEvents } from "../src/metrics.js";

describe("metrics", () => {
  it("derives the single-run report from structured events", () => {
    const state = playGame("42", { turnCount: 9 });
    const metrics = metricsFromEvents(state.events);
    const evolutions = state.events.filter((event) => event.type === "EVOLUTION");
    const altar = state.events.filter((event) => event.type === "TO_ALTAR");
    const veil = state.events.filter((event) => event.type === "TO_VEIL");
    const drawn = state.events.filter((event) => event.type === "REFILL").reduce((sum, event) => sum + (event.type === "REFILL" ? event.slots.length : 0), 0);
    const setup = state.events.find((event) => event.type === "SETUP");
    expect(setup?.type).toBe("SETUP");
    expect(metrics.totalEvolutions).toBe(evolutions.length);
    expect(metrics.cardsFromHand).toBe(evolutions.filter((event) => event.type === "EVOLUTION" && event.source === "hand").length);
    expect(metrics.cardsFromEncounter).toBe(evolutions.filter((event) => event.type === "EVOLUTION" && event.source === "encounter").length);
    expect(metrics.unusedEncountersToAltar).toBe(altar.length);
    expect(metrics.altarOverflows).toBe(veil.length);
    expect(metrics.veilCount).toBe(veil.length);
    expect(metrics.finalAltarMinorCount).toBe(altar.length - veil.length);
    expect(metrics.finalDeckCount).toBe((setup?.type === "SETUP" ? setup.deckCount : 0) - drawn);
    expect(metrics.completedTurns).toBe(9);
    expect(metrics.reachedRank6["P1"]).toBe(metrics.finalTopRank["P1"] === 6);
    expect(metrics.finalTopRank["P1"]).toBe(state.players[0].lineage.at(-1)?.rank);
  });

  it("counts ending ranks per player and overall", () => {
    const stats = runBatch({ seeds: ["1", "2"], config: { turnCount: 4 } });
    for (const rates of [stats.rankDistribution.P1, stats.rankDistribution.P2, stats.rankDistribution.overall]) {
      const total = Object.values(rates).reduce((sum, rate) => sum + rate, 0);
      expect(total).toBeCloseTo(1);
    }
    const metrics = ["1", "2"].map((seed) => metricsFromEvents(playGame(seed, { turnCount: 4 }).events));
    const p1At = (rank: number) => metrics.filter((row) => row.finalTopRank["P1"] === rank).length / metrics.length;
    expect(stats.rankDistribution.P1[6]).toBe(p1At(6));
  });
});
