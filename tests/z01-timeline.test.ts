import { describe, expect, it } from "vitest";
import { minor } from "../src/cards.js";
import { playGame } from "../src/engine.js";
import { playL02 } from "../src/l02/engine.js";
import { boardFromState, captureFrames, type BoardSnap } from "../src/z01/capture.js";
import { inspectBoard } from "../src/z01/inspect.js";
import { DEFAULT_LAYER, LAYER_COPY, roundTableHint } from "../src/z01/layers.js";
import { buildTimeline, explainEvent, highlightFor, moveTimeline } from "../src/z01/timeline.js";

describe("admin playtest copy", () => {
  it("defaults to the Z02 collection loop and names both layers", () => {
    expect(DEFAULT_LAYER).toBe("L02");
    expect(LAYER_COPY.L02.code).toBe("Z02 / L02");
    expect(LAYER_COPY.L02.name).toBe("Collection + Altar + Veil");
    expect(LAYER_COPY.L02.rules).toMatch(/Collect one table card/);
    expect(LAYER_COPY.L01.code).toBe("Z01 / L01");
    expect(LAYER_COPY.L01.rules).toMatch(/pending encounter/);
  });

  it("gives the round table a hint only for the action events", () => {
    expect(roundTableHint("REFILL")).toBe("New cards entered these slots.");
    expect(roundTableHint("COLLECT")).toBe("This card was collected into hand.");
    expect(roundTableHint("TO_ALTAR")).toBe("Uncollected card moved to altar.");
    expect(roundTableHint("PENDING_ENCOUNTER")).toBe("This card waits until next turn.");
    expect(roundTableHint("EVOLUTION")).toBeNull();
  });

  it("labels an open table slot empty", () => {
    const board: BoardSnap = {
      status: "running",
      completedTurns: 0,
      activePlayerIndex: 0,
      players: [
        { id: "P1", lineage: [minor("fire", 1)], hand: [] },
        { id: "P2", lineage: [minor("water", 1)], hand: [] },
      ],
      deck: [],
      roundTable: [null, minor("air", 2), null],
      pendingCardId: null,
      altarMinors: [],
      altarMajor: null,
      veil: [],
      pd: null,
      teamMilestones: 0,
    };
    const view = inspectBoard("L02", board, { cardIds: [], zones: [], slots: [] });
    const table = view.zones.find((zone) => zone.id === "round-table");
    expect(table?.cards.map((card) => card.blank ?? card.title)).toEqual(["empty", "2 of Air", "empty"]);
    expect(table?.cards.some((card) => card.element === "unknown" || card.rankLabel === "·")).toBe(false);
    expect(view.players[0]?.zones.find((zone) => zone.id === "lineage")?.quiet).toBe(true);
  });
});

describe("Z01 timeline", () => {
  it("records one L01 snapshot per event and matches the final board", () => {
    const { result, frames } = captureFrames(() => playGame("42"));
    expect(frames).toHaveLength(result.events.length);
    expect(frames[0]?.completedTurns).toBe(0);
    expect(result.events[0]?.type).toBe("SETUP");
    expect(frames.at(-1)).toEqual(boardFromState(result));
  });

  it("records one L02 snapshot per event and matches the final board", () => {
    const { result, frames } = captureFrames(() => playL02("42", { turnCount: 6 }));
    expect(frames).toHaveLength(result.events.length);
    expect(frames[0]?.players.map((player) => player.lineage[0]?.id)).toEqual(["minor-fire-1", "minor-water-1"]);
    expect(frames.at(-1)).toEqual(boardFromState(result));
    const again = captureFrames(() => playL02("42", { turnCount: 6 }));
    expect(again.frames).toEqual(frames);
  });

  it("steps deterministically and explains the selected event", () => {
    expect(moveTimeline(0, 5, "back")).toBe(0);
    expect(moveTimeline(0, 5, "next")).toBe(1);
    expect(moveTimeline(4, 5, "next")).toBe(4);
    expect(moveTimeline(2, 5, "start")).toBe(0);
    expect(moveTimeline(2, 5, "end")).toBe(4);

    const { result, frames } = captureFrames(() => playL02("42", { turnCount: 6 }));
    const timeline = buildTimeline("L02", result.seed, result.events, frames);
    expect(timeline.turnCount).toBe(6);
    const evolved = timeline.frames.find((frame) => frame.eventType === "EVOLUTION");
    const collected = timeline.frames.find((frame) => frame.eventType === "COLLECT");
    const altar = timeline.frames.find((frame) => frame.eventType === "TO_ALTAR");
    const veil = timeline.frames.find((frame) => frame.eventType === "TO_VEIL");
    const water = timeline.frames.find((frame) => frame.eventType === "RESURFACE");
    const air = timeline.frames.find((frame) => frame.eventType === "SWAP");
    const refill = timeline.frames.find((frame) => frame.eventType === "REFILL");
    const turn = timeline.frames.find((frame) => frame.eventType === "TURN_START");
    const done = timeline.frames.find((frame) => frame.eventType === "COMPLETE");

    expect(evolved?.highlight.zones).toContain("player:P1:lineage");
    expect(evolved?.highlight.cardIds.length).toBeGreaterThan(0);
    expect(collected?.highlight.zones).toContain("player:P1:hand");
    expect(altar?.highlight.zones).toEqual(["altar-minors"]);
    expect(veil?.highlight.zones).toEqual(["veil"]);
    expect(water?.highlight.zones).toEqual(["veil", "altar-minors"]);
    expect(air?.highlight.slots).toEqual([1]);
    expect(refill?.highlight.zones).toEqual(["round-table"]);
    expect(turn?.highlight.zones[0]).toMatch(/^player:P/);
    expect(done?.highlight.zones).toEqual(["metrics"]);
    expect(evolved?.explanation).toMatch(/evolved from/);
    expect(altar?.explanation).toMatch(/altar/);
  });

  it("keeps highlight metadata for an L01 encounter evolution", () => {
    const highlight = highlightFor({
      type: "EVOLUTION",
      playerId: "P2",
      source: "encounter",
      from: { id: "minor-water-1", rank: 1, element: "water" },
      to: { id: "minor-earth-3", rank: 3, element: "earth" },
    });
    expect(highlight.zones).toContain("round-table");
    expect(highlight.cardIds).toEqual(["minor-water-1", "minor-earth-3"]);
    expect(explainEvent({
      type: "TO_VEIL",
      card: { id: "minor-fire-4", rank: 4, element: "fire" },
      reason: "altar-overflow",
    })).toMatch(/Veil because the altar was full/);
  });
});
