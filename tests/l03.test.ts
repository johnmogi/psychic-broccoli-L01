import { describe, expect, it } from "vitest";
import { createMajorCatalog } from "../src/cards.js";
import { captureFrames } from "../src/z01/capture.js";
import { playL03, isDefaultEclipse } from "../src/l03/engine.js";
import { major } from "../src/cards.js";
import { l03MetricsFromEvents } from "../src/l03/metrics.js";
import { settingSpecs } from "../src/z01/settings.js";
import { diagnose } from "../src/z01/diagnostics.js";
import { main } from "../src/cli.js";

const sunQueen = "major-sun-air-queen";
const moonQueen = "major-moon-fire-queen";
const sunQueenEarth = "major-sun-earth-queen";
const moonKing = "major-moon-earth-king";
const sunKing = "major-sun-earth-king";

function scripted(ids: string[], turns = 3) {
  return playL03("script", { turnCount: turns, majorDeckMode: "scripted", scriptedMajorIds: ids, waterResurfaceEnabled: false, airSwapEnabled: false });
}

describe("Z03 eclipse layer", () => {
  it("lists the full 24-major catalog", () => {
    const catalog = createMajorCatalog();
    expect(catalog).toHaveLength(24);
    expect(new Set(catalog.map((card) => card.court))).toEqual(new Set(["prince", "queen", "king"]));
    expect(new Set(catalog.map((card) => card.element))).toEqual(new Set(["air", "fire", "water", "earth"]));
    expect(new Set(catalog.map((card) => card.back))).toEqual(new Set(["sun", "moon"]));
    expect(isDefaultEclipse(major("sun", "air", "queen"), major("moon", "fire", "queen"))).toBe(true);
    expect(isDefaultEclipse(major("sun", "air", "queen"), major("sun", "earth", "queen"))).toBe(false);
    expect(isDefaultEclipse(major("sun", "air", "queen"), major("moon", "earth", "king"))).toBe(false);
  });

  it("routes one major to PD and surfaces it next turn", () => {
    const state = scripted([sunQueen], 3);
    const types = state.events.map((event) => event.type);
    expect(types).toContain("TO_PD");
    expect(types).toContain("PD_SURFACE");
    expect(types.filter((type) => type === "COLLECT").length).toBeGreaterThan(0);
    expect(state.events.some((event) => event.type === "COLLECT" && event.card.arcana !== "minor")).toBe(false);
    const toPd = state.events.findIndex((event) => event.type === "TO_PD");
    const surface = state.events.findIndex((event) => event.type === "PD_SURFACE");
    expect(surface).toBeGreaterThan(toPd);
  });

  it("eclipses opposite-back queens and replaces a non-eclipse pair", () => {
    const eclipse = scripted([sunQueen, moonQueen], 2);
    expect(eclipse.events.some((event) => event.type === "ECLIPSE")).toBe(true);
    expect(eclipse.events.some((event) => event.type === "JOKER_AWARDED")).toBe(true);
    expect(eclipse.teamMilestones).toBeGreaterThan(0);
    const sameBack = scripted([sunQueen, sunQueenEarth], 2);
    expect(sameBack.events.some((event) => event.type === "ECLIPSE")).toBe(false);
    expect(sameBack.events.some((event) => event.type === "MAJOR_REPLACED")).toBe(true);
    expect(sameBack.events.some((event) => event.type === "MAJOR_TO_VEIL" && event.reason === "replaced")).toBe(true);
    expect(sameBack.altar.major?.id).toBe(sunQueenEarth);
    const differentRank = scripted([sunQueen, moonKing], 2);
    expect(differentRank.events.some((event) => event.type === "ECLIPSE")).toBe(false);
  });

  it("triangulates three majors of the same rank and ignores a mixed set", () => {
    const queens = scripted([sunQueen, moonQueen, sunQueenEarth], 2);
    expect(queens.events.filter((event) => event.type === "TRIANGULATION")).toHaveLength(1);
    expect(queens.events.some((event) => event.type === "TEAM_MILESTONE")).toBe(true);
    expect(queens.altar.major).not.toBeNull();
    const mixed = scripted([sunQueen, moonQueen, sunKing], 2);
    expect(mixed.events.some((event) => event.type === "TRIANGULATION")).toBe(false);
    const easy = playL03("script", {
      turnCount: 2,
      majorDeckMode: "scripted",
      scriptedMajorIds: [sunQueen, moonQueen, sunKing],
      triangulationMode: "anyThreeMajors",
      waterResurfaceEnabled: false,
      airSwapEnabled: false,
    });
    expect(easy.events.filter((event) => event.type === "TRIANGULATION")).toHaveLength(1);
    const off = playL03("script", {
      turnCount: 2,
      majorDeckMode: "scripted",
      scriptedMajorIds: [sunQueen, moonQueen, sunQueenEarth],
      triangulationEnabled: false,
      waterResurfaceEnabled: false,
      airSwapEnabled: false,
    });
    expect(off.events.some((event) => event.type === "TRIANGULATION")).toBe(false);
  });

  it("keeps the full catalog in a scripted deck and stays deterministic", () => {
    const state = scripted([sunQueen], 2);
    expect(state.deck.filter((card) => card.arcana === "major").length + state.events.filter((event) => event.type === "MAJOR_REVEALED").length).toBe(24);
    const again = scripted([sunQueen], 2);
    expect(again.events).toEqual(state.events);
    expect(() => playL03("script", {
      turnCount: 2,
      majorDeckMode: "scripted",
      scriptedMajorIds: [sunQueen, sunKing],
      majorOverflowMode: "activeChoice",
      waterResurfaceEnabled: false,
      airSwapEnabled: false,
    })).toThrow(/activeChoice/);
    expect(() => playL03("x", { highLevelMajorChoice: true })).toThrow(/highLevelMajorChoice/);
  });

  it("derives metrics from events and captures a timeline", () => {
    const { result, frames } = captureFrames(() => scripted([sunQueen, moonQueen], 3));
    expect(frames).toHaveLength(result.events.length);
    expect(frames[frames.length - 1]?.altarMajor?.id).toBe(result.altar.major?.id);
    const metrics = l03MetricsFromEvents(result.events, result.pd ? 1 : 0, result.altar.major?.name ?? "");
    expect(metrics.eclipses).toBe(result.events.filter((event) => event.type === "ECLIPSE").length);
    expect(metrics.majorsToPd + metrics.eclipses + metrics.majorReplacements).toBeGreaterThan(0);
    const resurfaced = result.events.filter((event) => event.type === "RESURFACE");
    expect(resurfaced.every((event) => event.card.arcana === "minor")).toBe(true);
  });

  it("runs the l03 CLI", () => {
    const log = main(["l03", "--seed", "42", "--turns", "2"]);
    expect(log).toMatch(/L03 TURNS 2/);
    expect(log).toMatch(/L03 METRICS/);
  });

  it("describes same-rank triangulation and classifies the lab rates", () => {
    const specs = settingSpecs("L03");
    const rule = specs.find((spec) => spec.id === "triangulationMode");
    expect(rule?.options?.map((option) => option.label).join(" ")).toMatch(/same rank/);
    expect(rule?.note).toMatch(/Round Table \+ PD \+ altar/);
    expect(specs.find((spec) => spec.id === "majorDeckMode")?.options?.[0]?.label).toMatch(/24 majors/);
    expect(diagnose({ triangulationRate: 1 })[0]?.status).toBe("problem");
    expect(diagnose({ eclipseRate: 0.99 })[0]?.status).not.toBe("problem");
    expect(diagnose({ eclipseRate: 0.9 })[0]?.status).toBe("healthy");
    expect(diagnose({ eclipseRate: 0.4 })[0]?.status).toBe("problem");
  });
});
