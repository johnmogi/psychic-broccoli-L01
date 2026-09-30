import { describe, expect, it } from "vitest";
import { playGame } from "../src/engine.js";
import { playL02 } from "../src/l02/engine.js";
import { boardFromState, captureFrames } from "../src/z01/capture.js";
import { buildTimeline, explainEvent, highlightFor, moveTimeline } from "../src/z01/timeline.js";

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
