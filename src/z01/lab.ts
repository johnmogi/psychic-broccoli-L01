import type { AlignmentRule, MaxJump } from "../config.js";
import { percent } from "../metrics.js";
import { seedList } from "../rng.js";
import { compareL02, runL02Batch } from "../l02/compare.js";
import type { L02BatchStats } from "../l02/metrics.js";

export interface LabSettings {
  runs: number;
  seedStart: number;
  turns: number;
  alignmentRule: AlignmentRule;
  maxJump: MaxJump;
  water: boolean;
  air: boolean;
}

export function labBatch(settings: LabSettings): L02BatchStats {
  return runL02Batch({
    seeds: seedList(settings.seedStart, settings.runs),
    config: {
      turnCount: settings.turns,
      alignmentRule: settings.alignmentRule,
      maxJump: settings.maxJump,
      waterResurfaceEnabled: settings.water,
      airSwapEnabled: settings.air,
    },
  });
}

export function labCompare(settings: Pick<LabSettings, "runs" | "seedStart" | "turns">) {
  return compareL02({ runs: settings.runs, seedStart: settings.seedStart, turnCount: settings.turns });
}

export function batchRows(stats: L02BatchStats): { label: string; value: string }[] {
  return [
    { label: "Rank 6", value: percent(stats.playerRank6Rate) },
    { label: "P1 rank 6", value: percent(stats.p1Rank6Rate) },
    { label: "P2 rank 6", value: percent(stats.p2Rank6Rate) },
    { label: "Average final rank", value: stats.averageFinalRank.toFixed(2) },
    { label: "Average evolutions", value: stats.averageEvolutions.toFixed(2) },
    { label: "Average collected", value: stats.averageCollected.toFixed(2) },
    { label: "Average altar sends", value: stats.averageAltarSends.toFixed(2) },
    { label: "Average altar overflow", value: stats.averageOverflows.toFixed(2) },
    { label: "Average veil", value: stats.averageVeil.toFixed(2) },
    { label: "Average Water", value: stats.averageWater.toFixed(2) },
    { label: "Average Air", value: stats.averageAir.toFixed(2) },
    { label: "Average recovered", value: stats.averageRecovered.toFixed(2) },
    { label: "Deck exhaustion", value: stats.averageDeckExhaustion.toFixed(2) },
  ];
}
