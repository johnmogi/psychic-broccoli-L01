import { seedList } from "../rng.js";
import type { L03Config } from "./config.js";
import { playL03 } from "./engine.js";
import { aggregateL03, formatL03Compare, l03MetricsFromEvents, type L03BatchStats } from "./metrics.js";

export const L03_COMPARE_SCRIPT = ["major-sun-air-queen", "major-moon-fire-queen", "major-sun-earth-king"];

export function runL03Batch(request: { seeds: readonly string[]; config?: Partial<L03Config>; name?: string }): L03BatchStats {
  const config = request.config ?? {};
  const metrics = request.seeds.map((seed) => {
    const result = playL03(seed, config);
    return l03MetricsFromEvents(result.events, result.pd ? 1 : 0, result.altar.major?.name ?? "");
  });
  return {
    ...aggregateL03(metrics, request.name ?? ""),
    turnCount: config.turnCount ?? metrics[0]?.turnCount ?? 9,
    alignmentRule: config.alignmentRule ?? "sameColor",
    maxJump: config.maxJump ?? 2,
  };
}

export function compareL03(request: { runs: number; seedStart: number; turnCount: number }): { seeds: string[]; rows: L03BatchStats[] } {
  const seeds = seedList(request.seedStart, request.runs);
  const shared = { turnCount: request.turnCount };
  const rows = [
    runL03Batch({ seeds, name: "full/eclipse/tri", config: { ...shared, majorDeckMode: "full", eclipseEnabled: true, triangulationEnabled: true } }),
    runL03Batch({ seeds, name: "scripted/eclipse/tri", config: { ...shared, majorDeckMode: "scripted", scriptedMajorIds: L03_COMPARE_SCRIPT, eclipseEnabled: true, triangulationEnabled: true } }),
    runL03Batch({ seeds, name: "full/no-eclipse", config: { ...shared, majorDeckMode: "full", eclipseEnabled: false, triangulationEnabled: true } }),
    runL03Batch({ seeds, name: "full/no-triangulation", config: { ...shared, majorDeckMode: "full", eclipseEnabled: true, triangulationEnabled: false } }),
  ];
  return { seeds, rows };
}

export { formatL03Compare };
