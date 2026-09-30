import { describe, expect, it } from "vitest";
import { minor } from "../src/cards.js";
import { main } from "../src/cli.js";
import { L02_DEFAULTS } from "../src/l02/config.js";
import { compareL02 } from "../src/l02/compare.js";
import { applyAirSwap, applyWaterResurface, playL02, resolveTurn } from "../src/l02/engine.js";
import { l02MetricsFromEvents } from "../src/l02/metrics.js";
import type { L02State } from "../src/l02/state.js";
import { seedList } from "../src/rng.js";

function fixture(patch: Partial<L02State> = {}): L02State {
  return {
    seed: "fixture",
    config: { ...L02_DEFAULTS, turnCount: 1 },
    status: "running",
    completedTurns: 0,
    activePlayerIndex: 0,
    players: [
      { id: "P1", lineage: [minor("fire", 1)], hand: [minor("water", 2), minor("water", 3)] },
      { id: "P2", lineage: [minor("water", 1)], hand: [minor("earth", 2), minor("earth", 3)] },
    ],
    deck: [minor("air", 4), minor("air", 5), minor("air", 6)],
    roundTable: [minor("earth", 4), minor("earth", 5), minor("earth", 6)],
    altar: { minors: [], major: null },
    veil: [],
    events: [],
    ...patch,
  };
}

describe("L02", () => {
  it("deals two players, hands, a 3-slot table, an altar, and a veil", () => {
    const state = playL02("42", { turnCount: 1 });
    expect(state.players).toHaveLength(2);
    expect(state.players[0].lineage[0]?.id).toBe("minor-fire-1");
    expect(state.players[1].lineage[0]?.id).toBe("minor-water-1");
    const setup = state.events.find((event) => event.type === "SETUP");
    expect(setup?.type).toBe("SETUP");
    if (setup?.type === "SETUP") {
      expect(setup.players[0]?.hand).toHaveLength(2);
      expect(setup.players[1]?.hand).toHaveLength(2);
      expect(setup.roundTable).toHaveLength(3);
    }
    expect(state.altar.major).toBeNull();
    expect(state.altar.minors.length).toBeLessThanOrEqual(3);
    expect(Array.isArray(state.veil)).toBe(true);
  });

  it("collects one table card and sends the rest to the altar", () => {
    const state = resolveTurn(fixture());
    const collected = state.events.filter((event) => event.type === "COLLECT");
    const altar = state.events.filter((event) => event.type === "TO_ALTAR" && event.reason === "uncollected");
    expect(collected).toHaveLength(1);
    expect(collected[0]).toMatchObject({ card: { id: "minor-earth-4" } });
    expect(altar.map((event) => (event.type === "TO_ALTAR" ? event.card.id : ""))).toEqual(["minor-earth-5", "minor-earth-6"]);
    expect(state.roundTable.every((card) => card === null)).toBe(true);
  });

  it("overflows the oldest altar minor into the veil", () => {
    const state = resolveTurn(fixture({
      altar: { minors: [minor("fire", 4), minor("fire", 5), minor("fire", 6)], major: null },
      roundTable: [minor("water", 6), minor("air", 2), minor("air", 3)],
    }));
    const veil = state.events.filter((event) => event.type === "TO_VEIL" && event.reason === "altar-overflow");
    expect(veil.map((event) => (event.type === "TO_VEIL" ? event.card.id : ""))).toEqual(["minor-fire-4", "minor-fire-5"]);
    expect(state.altar.minors.map((card) => card.id)).toEqual(["minor-fire-6", "minor-air-2", "minor-air-3"]);
  });

  it("evolves from collected and starting hand cards with L01 legality", () => {
    const state = resolveTurn(fixture({
      players: [
        { id: "P1", lineage: [minor("fire", 1)], hand: [minor("fire", 2), minor("air", 3)] },
        { id: "P2", lineage: [minor("water", 1)], hand: [minor("earth", 2), minor("earth", 3)] },
      ],
      roundTable: [minor("water", 4), minor("earth", 5), minor("earth", 6)],
    }));
    expect(state.players[0].lineage.map((card) => card.id)).toEqual(["minor-fire-1", "minor-fire-2", "minor-air-3"]);
  });

  it("spends Water to resurface the veil top onto the altar", () => {
    const state = fixture({ veil: [minor("fire", 6)] });
    applyWaterResurface(state, state.players[0]);
    expect(state.players[0].hand.map((card) => card.id)).toEqual(["minor-water-3"]);
    expect(state.altar.minors.map((card) => card.id)).toEqual(["minor-fire-6"]);
    expect(state.veil.map((card) => card.id)).toEqual(["minor-water-2"]);
    expect(state.events.some((event) => event.type === "RESURFACE")).toBe(true);
  });

  it("spends Air to swap the leftmost table card with the veil top", () => {
    const state = fixture({
      players: [
        { id: "P1", lineage: [minor("fire", 1)], hand: [minor("air", 2)] },
        { id: "P2", lineage: [minor("water", 1)], hand: [minor("earth", 2), minor("earth", 3)] },
      ],
      roundTable: [minor("earth", 4), null, null],
      veil: [minor("fire", 6)],
    });
    applyAirSwap(state, state.players[0]);
    expect(state.roundTable[0]?.id).toBe("minor-fire-6");
    expect(state.veil.map((card) => card.id)).toEqual(["minor-earth-4", "minor-air-2"]);
    expect(state.events.some((event) => event.type === "SWAP")).toBe(true);
  });

  it("rejects veil effects when the veil is empty", () => {
    const state = fixture();
    expect(() => applyWaterResurface(state, state.players[0])).toThrow(/Veil is empty/);
    expect(() => applyAirSwap(state, state.players[0])).toThrow(/Veil is empty/);
  });

  it("stops after the elemental effect limit", () => {
    const state = fixture({
      config: { ...L02_DEFAULTS, maxElementalEffectsPerTurn: 1 },
      veil: [minor("fire", 6)],
    });
    applyWaterResurface(state, state.players[0], 1);
    expect(() => applyWaterResurface(state, state.players[0], 1)).toThrow(/elemental effect limit/);
  });

  it("uses a veil effect only when the bot did not evolve", () => {
    const quiet = resolveTurn(fixture({ veil: [minor("fire", 6)] }));
    expect(quiet.events.some((event) => event.type === "WATER_SPEND")).toBe(true);
    const evolved = resolveTurn(fixture({
      players: [
        { id: "P1", lineage: [minor("fire", 1)], hand: [minor("fire", 2), minor("water", 2)] },
        { id: "P2", lineage: [minor("water", 1)], hand: [minor("earth", 2), minor("earth", 3)] },
      ],
      veil: [minor("fire", 6)],
    }));
    expect(evolved.events.some((event) => event.type === "EVOLUTION")).toBe(true);
    expect(evolved.events.some((event) => event.type === "WATER_SPEND" || event.type === "AIR_SPEND")).toBe(false);
  });

  it("repeats structured events for the same seed", () => {
    expect(playL02("42", { turnCount: 6 }).events).toEqual(playL02("42", { turnCount: 6 }).events);
  });

  it("derives batch metrics from events", () => {
    const state = playL02("7", { turnCount: 4 });
    const metrics = l02MetricsFromEvents(state.events);
    expect(metrics.cardsCollected).toBe(state.events.filter((event) => event.type === "COLLECT").length);
    expect(metrics.cardsEvolvedFromHand).toBe(state.events.filter((event) => event.type === "EVOLUTION").length);
    expect(metrics.waterResurfaces).toBe(state.events.filter((event) => event.type === "RESURFACE").length);
    expect(metrics.airSwaps).toBe(state.events.filter((event) => event.type === "SWAP").length);
    expect(metrics.cardsRecoveredFromVeil).toBe(metrics.waterResurfaces + metrics.airSwaps);
    const compared = compareL02({ runs: 3, seedStart: 4, turnCount: 4 });
    expect(compared.seeds).toEqual(seedList(4, 3));
    expect(compared.rows.map((row) => row.name)).toEqual(["sameColor/+2", "sameColor/+1", "sameElement/+2", "sameElement/+1"]);
  });

  it("runs the L02 CLI", () => {
    expect(main(["l02", "--seed", "42", "--turns", "4"])).toContain("L02 COMPLETE");
    expect(main(["l02", "batch", "--runs", "2", "--seed-start", "1", "--turns", "4"])).toContain("L02 BATCH");
    const compare = main(["l02", "compare", "--runs", "2", "--seed-start", "1", "--turns", "4"]);
    expect(compare).toContain("L02 COMPARE");
    expect(compare).toContain("sameColor/+2");
    expect(compare).toContain("sameElement/+1");
  });
});
