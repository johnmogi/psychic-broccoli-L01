import { describe, expect, it } from "vitest";
import { playGame } from "../src/engine.js";
import { playL02 } from "../src/l02/engine.js";
import { l02MetricsFromEvents } from "../src/l02/metrics.js";
import { consoleFrom, inspectL01, inspectL02 } from "../src/z01/inspect.js";
import { requestFromValues, settingSpecs } from "../src/z01/settings.js";

describe("Z01 inspection", () => {
  it("projects an L02 run into players, zones, metrics, and one console entry per event", () => {
    const state = playL02("42");
    const view = inspectL02(state);
    const metrics = l02MetricsFromEvents(state.events);

    expect(view.players.map((player) => player.id)).toEqual(["P1", "P2"]);
    expect(view.players[0]?.zones.map((zone) => zone.id)).toEqual(["lineage", "hand"]);
    expect(view.zones.map((zone) => zone.id)).toEqual(["round-table", "altar-minors", "altar-major", "veil", "deck"]);
    expect(view.console).toHaveLength(state.events.length);
    expect(view.console.map((entry) => entry.eventType)).toEqual(state.events.map((event) => event.type));
    expect(view.console.every((entry) => entry.channel === "admin" && entry.role === "log")).toBe(true);
    expect(view.metrics.find((item) => item.id === "veilCount")?.value).toBe(String(metrics.veilCount));
    expect(view.metrics.find((item) => item.id === "waterResurfaces")?.value).toBe(String(metrics.waterResurfaces));
  });

  it("keeps an empty L01 pending zone instead of inventing a card", () => {
    const view = inspectL01(playGame("42"));
    expect(view.zones.find((zone) => zone.id === "pending")?.cards).toEqual([]);
    expect(view.layer).toBe("L01");
  });

  it("passes an unknown event through as structured scrollback", () => {
    const entries = consoleFrom([{ type: "STORY_BEAT", line: "the veil stirs" }]);
    expect(entries[0]).toMatchObject({
      eventType: "STORY_BEAT",
      channel: "admin",
      text: 'STORY_BEAT {"line":"the veil stirs"}',
    });
  });

  it("exposes engine settings without a command field", () => {
    const ids = settingSpecs("L02").map((spec) => spec.id);
    expect(ids).toContain("altarOverflowMode");
    expect(ids).not.toContain("command");
    const request = requestFromValues("L02", {
      seed: "42",
      turnCount: "6",
      alignmentRule: "sameColor",
      maxJump: "2",
      waterResurfaceEnabled: "true",
      airSwapEnabled: "false",
      altarOverflowMode: "oldest",
    });
    expect(request.l02.airSwapEnabled).toBe(false);
    expect(request.seed).toBe("42");
  });
});
