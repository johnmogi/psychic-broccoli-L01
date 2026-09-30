import { COMPARE_PRESETS } from "../config.js";
import { seedList } from "../rng.js";
import type { L02Config } from "./config.js";
import { playL02 } from "./engine.js";
import { aggregateL02, formatL02Compare, l02MetricsFromEvents, type L02BatchStats } from "./metrics.js";

export interface L02BatchRequest {
  seeds: readonly string[];
  config?: Partial<L02Config>;
}

export function runL02Batch(request: L02BatchRequest): L02BatchStats {
  const config = request.config ?? {};
  const metrics = request.seeds.map((seed) => l02MetricsFromEvents(playL02(seed, config).events));
  const resolvedJump = config.maxJump ?? 2;
  const resolvedAlignment = config.alignmentRule ?? "sameColor";
  return {
    ...aggregateL02(metrics),
    turnCount: config.turnCount ?? metrics[0]?.turnCount ?? 6,
    alignmentRule: resolvedAlignment,
    maxJump: resolvedJump,
  };
}

export function compareL02(request: { runs: number; seedStart: number; turnCount: number }): { seeds: string[]; rows: (L02BatchStats & { name: string })[] } {
  const seeds = seedList(request.seedStart, request.runs);
  const rows = COMPARE_PRESETS.map((preset) => {
    const stats = runL02Batch({
      seeds,
      config: { turnCount: request.turnCount, alignmentRule: preset.alignmentRule, maxJump: preset.maxJump },
    });
    return { name: preset.name, ...stats };
  });
  return { seeds, rows };
}

export { formatL02Compare };
