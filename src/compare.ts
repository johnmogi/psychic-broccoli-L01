import { COMPARE_PRESETS, resolveConfig, type L01Config } from "./config.js";
import { playGame } from "./engine.js";
import { aggregate, formatBatch, formatRankDistribution, percent, type BatchStats } from "./metrics.js";
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
  return { seeds, rows: rowsForTurns(seeds, [request.turnCount], request.maxEvolutionsPerTurn) };
}

export interface TuneRequest {
  runs: number;
  seedStart: number;
  turnCounts: readonly number[];
  maxEvolutionsPerTurn: L01Config["maxEvolutionsPerTurn"];
}

export function tuneConfigs(request: TuneRequest): { seeds: string[]; rows: CompareRow[] } {
  if (!request.turnCounts.length) throw new Error("tune requires at least one turn count");
  const seeds = seedList(request.seedStart, request.runs);
  return { seeds, rows: rowsForTurns(seeds, request.turnCounts, request.maxEvolutionsPerTurn) };
}

function rowsForTurns(
  seeds: readonly string[],
  turnCounts: readonly number[],
  maxEvolutionsPerTurn: L01Config["maxEvolutionsPerTurn"],
): CompareRow[] {
  const rows: CompareRow[] = [];
  for (const turnCount of turnCounts) {
    for (const preset of COMPARE_PRESETS) {
      const stats = runBatch({
        seeds,
        config: {
          turnCount,
          alignmentRule: preset.alignmentRule,
          maxJump: preset.maxJump,
          maxEvolutionsPerTurn,
        },
      });
      rows.push({ name: preset.name, ...stats });
    }
  }
  return rows;
}

export function formatCompare(rows: readonly CompareRow[]): string {
  return formatTable("COMPARE", rows);
}

export function formatTune(rows: readonly CompareRow[]): string {
  const blocks = rows.map((row) =>
    [`${row.name} turns ${row.turnCount}`, formatRankDistribution(row.rankDistribution)].join("\n"),
  );
  return `${formatTable("TUNE", rows)}\n\nRANK DISTRIBUTION\n${blocks.join("\n")}`;
}

function formatTable(title: string, rows: readonly CompareRow[]): string {
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
  return [title, header, ...body].join("\n");
}

export { formatBatch };
