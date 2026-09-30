import { formatRankDistribution, LADDER_RANKS, percent, type RankDistribution, type RankRates } from "../metrics.js";
import type { L02Event } from "./events.js";

export interface L02RunMetrics {
  seed: string;
  turnCount: number;
  completedTurns: number;
  finalTopRank: Record<string, number>;
  reachedRank6: Record<string, boolean>;
  totalEvolutions: number;
  evolutionsPerPlayer: Record<string, number>;
  cardsCollected: number;
  cardsEvolvedFromHand: number;
  cardsSentToAltar: number;
  altarOverflows: number;
  veilCount: number;
  waterResurfaces: number;
  airSwaps: number;
  cardsRecoveredFromVeil: number;
  averageHandSize: number;
  deckExhaustionCount: number;
}

export interface L02BatchStats {
  runs: number;
  turnCount: number;
  alignmentRule: string;
  maxJump: number;
  p1Rank6Rate: number;
  p2Rank6Rate: number;
  playerRank6Rate: number;
  averageFinalRank: number;
  averageEvolutions: number;
  averageCollected: number;
  averageAltarSends: number;
  averageOverflows: number;
  averageVeil: number;
  averageWater: number;
  averageAir: number;
  averageRecovered: number;
  averageHandSize: number;
  averageDeckExhaustion: number;
  rankDistribution: RankDistribution;
}

export function l02MetricsFromEvents(events: readonly L02Event[]): L02RunMetrics {
  const setup = events.find((event) => event.type === "SETUP");
  const complete = events.find((event) => event.type === "COMPLETE");
  if (!setup || setup.type !== "SETUP") throw new Error("L02 metrics require SETUP");
  if (!complete || complete.type !== "COMPLETE") throw new Error("L02 metrics require COMPLETE");

  const finalTopRank: Record<string, number> = {};
  const evolutionsPerPlayer: Record<string, number> = {};
  for (const player of setup.players) {
    const top = player.lineage[player.lineage.length - 1];
    if (!top) throw new Error(`${player.id} setup lineage is empty`);
    finalTopRank[player.id] = top.rank;
    evolutionsPerPlayer[player.id] = 0;
  }

  let cardsCollected = 0;
  let cardsSentToAltar = 0;
  let altarOverflows = 0;
  let veilIn = 0;
  let veilOut = 0;
  let waterResurfaces = 0;
  let airSwaps = 0;
  let handSum = 0;
  let handSamples = 0;
  let deckExhaustionCount = 0;

  for (const event of events) {
    if (event.type === "EVOLUTION") {
      finalTopRank[event.playerId] = event.to.rank;
      evolutionsPerPlayer[event.playerId] = (evolutionsPerPlayer[event.playerId] ?? 0) + 1;
    } else if (event.type === "COLLECT") cardsCollected += 1;
    else if (event.type === "TO_ALTAR") cardsSentToAltar += 1;
    else if (event.type === "TO_VEIL") {
      veilIn += 1;
      if (event.reason === "altar-overflow") altarOverflows += 1;
    } else if (event.type === "RESURFACE") {
      waterResurfaces += 1;
      veilOut += 1;
    } else if (event.type === "SWAP") {
      airSwaps += 1;
      veilOut += 1;
    } else if (event.type === "HAND_SNAPSHOT") {
      handSum += event.size;
      handSamples += 1;
    } else if (event.type === "DECK_EXHAUSTED") deckExhaustionCount += 1;
  }

  const totalEvolutions = Object.values(evolutionsPerPlayer).reduce((sum, count) => sum + count, 0);
  return {
    seed: setup.seed,
    turnCount: setup.turnCount,
    completedTurns: complete.completedTurns,
    finalTopRank,
    reachedRank6: Object.fromEntries(Object.entries(finalTopRank).map(([id, rank]) => [id, rank === 6])),
    totalEvolutions,
    evolutionsPerPlayer,
    cardsCollected,
    cardsEvolvedFromHand: totalEvolutions,
    cardsSentToAltar,
    altarOverflows,
    veilCount: veilIn - veilOut,
    waterResurfaces,
    airSwaps,
    cardsRecoveredFromVeil: waterResurfaces + airSwaps,
    averageHandSize: handSamples ? handSum / handSamples : 0,
    deckExhaustionCount,
  };
}

export function aggregateL02(runs: readonly L02RunMetrics[]): L02BatchStats {
  if (!runs.length) throw new Error("L02 batch requires at least one run");
  const count = runs.length;
  const seats = count * 2;
  const mean = (pick: (metrics: L02RunMetrics) => number) => runs.reduce((sum, metrics) => sum + pick(metrics), 0) / count;
  const p1Hits = runs.filter((metrics) => metrics.reachedRank6["P1"]).length;
  const p2Hits = runs.filter((metrics) => metrics.reachedRank6["P2"]).length;
  const rankSum = runs.reduce((sum, metrics) => sum + (metrics.finalTopRank["P1"] ?? 0) + (metrics.finalTopRank["P2"] ?? 0), 0);
  return {
    runs: count,
    turnCount: runs[0]!.turnCount,
    alignmentRule: "",
    maxJump: 0,
    p1Rank6Rate: p1Hits / count,
    p2Rank6Rate: p2Hits / count,
    playerRank6Rate: (p1Hits + p2Hits) / seats,
    averageFinalRank: rankSum / seats,
    averageEvolutions: mean((metrics) => metrics.totalEvolutions),
    averageCollected: mean((metrics) => metrics.cardsCollected),
    averageAltarSends: mean((metrics) => metrics.cardsSentToAltar),
    averageOverflows: mean((metrics) => metrics.altarOverflows),
    averageVeil: mean((metrics) => metrics.veilCount),
    averageWater: mean((metrics) => metrics.waterResurfaces),
    averageAir: mean((metrics) => metrics.airSwaps),
    averageRecovered: mean((metrics) => metrics.cardsRecoveredFromVeil),
    averageHandSize: mean((metrics) => metrics.averageHandSize),
    averageDeckExhaustion: mean((metrics) => metrics.deckExhaustionCount),
    rankDistribution: {
      P1: rates(runs.map((metrics) => metrics.finalTopRank["P1"] ?? 0)),
      P2: rates(runs.map((metrics) => metrics.finalTopRank["P2"] ?? 0)),
      overall: rates(runs.flatMap((metrics) => [metrics.finalTopRank["P1"] ?? 0, metrics.finalTopRank["P2"] ?? 0])),
    },
  };
}

function rates(ranks: readonly number[]): RankRates {
  const result = {} as RankRates;
  for (const rank of LADDER_RANKS) result[rank] = ranks.length ? ranks.filter((value) => value === rank).length / ranks.length : 0;
  return result;
}

export function formatL02Metrics(metrics: L02RunMetrics): string {
  return [
    "L02 METRICS",
    `seed ${metrics.seed}`,
    `turnCount ${metrics.turnCount}`,
    `P1 top ${metrics.finalTopRank["P1"]} rank6 ${metrics.reachedRank6["P1"]}`,
    `P2 top ${metrics.finalTopRank["P2"]} rank6 ${metrics.reachedRank6["P2"]}`,
    `evolutions ${metrics.totalEvolutions}`,
    `collected ${metrics.cardsCollected}`,
    `evolved from hand ${metrics.cardsEvolvedFromHand}`,
    `altar sends ${metrics.cardsSentToAltar}`,
    `altar overflows ${metrics.altarOverflows}`,
    `veil ${metrics.veilCount}`,
    `water resurfaces ${metrics.waterResurfaces}`,
    `air swaps ${metrics.airSwaps}`,
    `recovered from veil ${metrics.cardsRecoveredFromVeil}`,
    `average hand size ${metrics.averageHandSize.toFixed(2)}`,
    `deck exhaustion ${metrics.deckExhaustionCount}`,
  ].join("\n");
}

export function formatL02Batch(stats: L02BatchStats): string {
  return [
    "L02 BATCH",
    `runs ${stats.runs}`,
    `turnCount ${stats.turnCount}`,
    `config ${stats.alignmentRule} jump ${stats.maxJump}`,
    `P1 rank6 ${percent(stats.p1Rank6Rate)}`,
    `P2 rank6 ${percent(stats.p2Rank6Rate)}`,
    `players rank6 ${percent(stats.playerRank6Rate)}`,
    `average final rank ${stats.averageFinalRank.toFixed(2)}`,
    `average evolutions ${stats.averageEvolutions.toFixed(2)}`,
    `average collected ${stats.averageCollected.toFixed(2)}`,
    `average altar sends ${stats.averageAltarSends.toFixed(2)}`,
    `average altar overflow ${stats.averageOverflows.toFixed(2)}`,
    `average veil ${stats.averageVeil.toFixed(2)}`,
    `average water ${stats.averageWater.toFixed(2)}`,
    `average air ${stats.averageAir.toFixed(2)}`,
    `average recovered ${stats.averageRecovered.toFixed(2)}`,
    `average hand size ${stats.averageHandSize.toFixed(2)}`,
    `average deck exhaustion ${stats.averageDeckExhaustion.toFixed(2)}`,
    "rank distribution",
    formatRankDistribution(stats.rankDistribution),
  ].join("\n");
}

export function formatL02Compare(rows: readonly (L02BatchStats & { name: string })[]): string {
  const header = ["config".padEnd(16), "runs".padStart(6), "turns".padStart(6), "P1 r6".padStart(8), "P2 r6".padStart(8), "players".padStart(8), "avg rank".padStart(9), "water".padStart(7), "air".padStart(7)].join(" ");
  const body = rows.map((row) =>
    [
      row.name.padEnd(16),
      String(row.runs).padStart(6),
      String(row.turnCount).padStart(6),
      percent(row.p1Rank6Rate).padStart(8),
      percent(row.p2Rank6Rate).padStart(8),
      percent(row.playerRank6Rate).padStart(8),
      row.averageFinalRank.toFixed(2).padStart(9),
      row.averageWater.toFixed(2).padStart(7),
      row.averageAir.toFixed(2).padStart(7),
    ].join(" "),
  );
  return ["L02 COMPARE", header, ...body].join("\n");
}
