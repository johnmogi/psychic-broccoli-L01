import { COMPARE_PRESETS, resolveConfig, type L01Config } from "./config.js";
import { playGame } from "./engine.js";
import { aggregate, formatBatch, percent, type BatchStats } from "./metrics.js";
import { metricsFromEvents } from "./metrics.js";
import { seedList } from "./rng.js";

export interface BatchRequest {
  seeds: readonly string[];
  config: Partial<L01Config>;
}

export function runBatch(request: BatchRequest): BatchStats {
  const config = resolveConfig(request.config);
  const metrics = request.seeds.map((seed) => metricsFromEvents(playGame(seed, config).events));
  return {
    ...aggregate(metrics),
    turnCount: config.turnCount,
    alignmentRule: config.alignmentRule,
    maxJump: config.maxJump,
    maxEvolutionsPerTurn: config.maxEvolutionsPerTurn,
  };
}

export interface CompareRequest {
  runs: number;
  seedStart: number;
  turnCount: number;
  maxEvolutionsPerTurn: L01Config["maxEvolutionsPerTurn"];
}

export interface CompareRow extends BatchStats {
  name: string;
}

export function compareConfigs(request: CompareRequest): { seeds: string[]; rows: CompareRow[] } {
  const seeds = seedList(request.seedStart, request.runs);
  const rows = COMPARE_PRESETS.map((preset) => {
    const stats = runBatch({
      seeds,
      config: {
        turnCount: request.turnCount,
        alignmentRule: preset.alignmentRule,
        maxJump: preset.maxJump,
        maxEvolutionsPerTurn: request.maxEvolutionsPerTurn,
      },
    });
    return { name: preset.name, ...stats };
  });
  return { seeds, rows };
}

export function formatCompare(rows: readonly CompareRow[]): string {
  const header = [
    "config".padEnd(16),
    "runs".padStart(6),
    "turns".padStart(6),
    "P1 r6".padStart(8),
    "P2 r6".padStart(8),
    "players".padStart(8),
    "avg rank".padStart(9),
    "avg evo".padStart(8),
    "overflow".padStart(9),
    "veil".padStart(8),
  ].join(" ");
  const body = rows.map((row) =>
    [
      row.name.padEnd(16),
      String(row.runs).padStart(6),
      String(row.turnCount).padStart(6),
      percent(row.p1Rank6Rate).padStart(8),
      percent(row.p2Rank6Rate).padStart(8),
      percent(row.playerRank6Rate).padStart(8),
      row.averageFinalRank.toFixed(2).padStart(9),
      row.averageEvolutions.toFixed(2).padStart(8),
      row.averageOverflows.toFixed(2).padStart(9),
      row.averageVeil.toFixed(2).padStart(8),
    ].join(" "),
  );
  return ["COMPARE", header, ...body].join("\n");
}

export { formatBatch };
