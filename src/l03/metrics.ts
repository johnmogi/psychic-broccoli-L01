import { formatRankDistribution, LADDER_RANKS, percent, type RankDistribution, type RankRates } from "../metrics.js";
import type { L03Event } from "./events.js";

export interface L03RunMetrics {
  seed: string;
  turnCount: number;
  finalTopRank: Record<string, number>;
  reachedRank6: Record<string, boolean>;
  totalEvolutions: number;
  cardsCollected: number;
  cardsSentToAltar: number;
  altarOverflows: number;
  veilCount: number;
  waterResurfaces: number;
  airSwaps: number;
  cardsRecoveredFromVeil: number;
  deckExhaustionCount: number;
  majorsSeen: number;
  uniqueMajorsSeen: number;
  majorsToPd: number;
  majorsSurfaced: number;
  majorReplacements: number;
  eclipses: number;
  triangulations: number;
  jokers: number;
  teamMilestones: number;
  maxCombinedMajors: number;
  finalAltarMajor: string;
  finalPdCount: number;
}

export interface L03BatchStats {
  runs: number;
  turnCount: number;
  alignmentRule: string;
  maxJump: number;
  name: string;
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
  averageMajorsSeen: number;
  majorSeenRate: number;
  averagePdSends: number;
  averageSurfaces: number;
  averageReplacements: number;
  averageEclipses: number;
  eclipseRate: number;
  averageTriangulations: number;
  triangulationRate: number;
  averageJokers: number;
  majorCongestion: number;
}

export function l03MetricsFromEvents(events: readonly L03Event[], finalPdCount = 0, finalAltarMajor = ""): L03RunMetrics {
  const setup = events.find((event) => event.type === "SETUP");
  const complete = events.find((event) => event.type === "COMPLETE");
  if (!setup || setup.type !== "SETUP") throw new Error("L03 metrics require SETUP");
  if (!complete || complete.type !== "COMPLETE") throw new Error("L03 metrics require COMPLETE");
  const finalTopRank: Record<string, number> = {};
  for (const player of setup.players) {
    const top = player.lineage[player.lineage.length - 1];
    if (!top) throw new Error(`${player.id} setup lineage is empty`);
    finalTopRank[player.id] = top.rank;
  }
  let cardsCollected = 0;
  let cardsSentToAltar = 0;
  let altarOverflows = 0;
  let veilIn = 0;
  let veilOut = 0;
  let waterResurfaces = 0;
  let airSwaps = 0;
  let deckExhaustionCount = 0;
  let totalEvolutions = 0;
  const seen = new Set<string>();
  let majorsToPd = 0;
  let majorsSurfaced = 0;
  let majorReplacements = 0;
  let eclipses = 0;
  let triangulations = 0;
  let jokers = 0;
  let teamMilestones = 0;
  for (const event of events) {
    if (event.type === "EVOLUTION") {
      finalTopRank[event.playerId] = event.to.rank;
      totalEvolutions += 1;
    } else if (event.type === "COLLECT") cardsCollected += 1;
    else if (event.type === "TO_ALTAR") cardsSentToAltar += 1;
    else if (event.type === "TO_VEIL") {
      veilIn += 1;
      if (event.reason === "altar-overflow") altarOverflows += 1;
    } else if (event.type === "MAJOR_TO_VEIL") veilIn += 1;
    else if (event.type === "RESURFACE") {
      waterResurfaces += 1;
      veilOut += 1;
    } else if (event.type === "SWAP") {
      airSwaps += 1;
      veilOut += 1;
    } else if (event.type === "DECK_EXHAUSTED") deckExhaustionCount += 1;
    else if (event.type === "MAJOR_REVEALED") seen.add(event.card.id);
    else if (event.type === "TO_PD") majorsToPd += 1;
    else if (event.type === "PD_SURFACE") majorsSurfaced += 1;
    else if (event.type === "MAJOR_REPLACED") majorReplacements += 1;
    else if (event.type === "ECLIPSE") eclipses += 1;
    else if (event.type === "TRIANGULATION") triangulations += 1;
    else if (event.type === "JOKER_AWARDED") jokers += 1;
    else if (event.type === "TEAM_MILESTONE") teamMilestones += 1;
  }
  return {
    seed: setup.seed,
    turnCount: setup.turnCount,
    finalTopRank,
    reachedRank6: Object.fromEntries(Object.entries(finalTopRank).map(([id, rank]) => [id, rank === 6])),
    totalEvolutions,
    cardsCollected,
    cardsSentToAltar,
    altarOverflows,
    veilCount: veilIn - veilOut,
    waterResurfaces,
    airSwaps,
    cardsRecoveredFromVeil: waterResurfaces + airSwaps,
    deckExhaustionCount,
    majorsSeen: seen.size,
    uniqueMajorsSeen: seen.size,
    majorsToPd,
    majorsSurfaced,
    majorReplacements,
    eclipses,
    triangulations,
    jokers,
    teamMilestones,
    maxCombinedMajors: complete.maxCombinedMajors,
    finalAltarMajor,
    finalPdCount,
  };
}

export function aggregateL03(runs: readonly L03RunMetrics[], name = ""): L03BatchStats {
  if (!runs.length) throw new Error("L03 batch requires at least one run");
  const count = runs.length;
  const seats = count * 2;
  const mean = (pick: (metrics: L03RunMetrics) => number) => runs.reduce((sum, metrics) => sum + pick(metrics), 0) / count;
  const p1Hits = runs.filter((metrics) => metrics.reachedRank6["P1"]).length;
  const p2Hits = runs.filter((metrics) => metrics.reachedRank6["P2"]).length;
  const rankSum = runs.reduce((sum, metrics) => sum + (metrics.finalTopRank["P1"] ?? 0) + (metrics.finalTopRank["P2"] ?? 0), 0);
  const catalog = 24;
  return {
    runs: count,
    turnCount: runs[0]!.turnCount,
    alignmentRule: "",
    maxJump: 0,
    name,
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
    averageHandSize: 0,
    averageDeckExhaustion: mean((metrics) => metrics.deckExhaustionCount),
    rankDistribution: {
      P1: rates(runs.map((metrics) => metrics.finalTopRank["P1"] ?? 0)),
      P2: rates(runs.map((metrics) => metrics.finalTopRank["P2"] ?? 0)),
      overall: rates(runs.flatMap((metrics) => [metrics.finalTopRank["P1"] ?? 0, metrics.finalTopRank["P2"] ?? 0])),
    },
    averageMajorsSeen: mean((metrics) => metrics.majorsSeen),
    majorSeenRate: mean((metrics) => metrics.uniqueMajorsSeen / catalog),
    averagePdSends: mean((metrics) => metrics.majorsToPd),
    averageSurfaces: mean((metrics) => metrics.majorsSurfaced),
    averageReplacements: mean((metrics) => metrics.majorReplacements),
    averageEclipses: mean((metrics) => metrics.eclipses),
    eclipseRate: runs.filter((metrics) => metrics.eclipses > 0).length / count,
    averageTriangulations: mean((metrics) => metrics.triangulations),
    triangulationRate: runs.filter((metrics) => metrics.triangulations > 0).length / count,
    averageJokers: mean((metrics) => metrics.jokers),
    majorCongestion: mean((metrics) => metrics.maxCombinedMajors),
  };
}

export function formatL03Metrics(metrics: L03RunMetrics): string {
  return [
    "L03 METRICS",
    `seed ${metrics.seed}`,
    `turnCount ${metrics.turnCount}`,
    `P1 top ${metrics.finalTopRank["P1"]} rank6 ${metrics.reachedRank6["P1"]}`,
    `P2 top ${metrics.finalTopRank["P2"]} rank6 ${metrics.reachedRank6["P2"]}`,
    `evolutions ${metrics.totalEvolutions}`,
    `collected ${metrics.cardsCollected}`,
    `altar sends ${metrics.cardsSentToAltar}`,
    `altar overflows ${metrics.altarOverflows}`,
    `veil ${metrics.veilCount}`,
    `water resurfaces ${metrics.waterResurfaces}`,
    `air swaps ${metrics.airSwaps}`,
    `majors seen ${metrics.majorsSeen}`,
    `to PD ${metrics.majorsToPd}`,
    `PD surfaces ${metrics.majorsSurfaced}`,
    `major replacements ${metrics.majorReplacements}`,
    `eclipses ${metrics.eclipses}`,
    `triangulations ${metrics.triangulations}`,
    `jokers ${metrics.jokers}`,
    `team milestones ${metrics.teamMilestones}`,
    `max combined majors ${metrics.maxCombinedMajors}`,
    `final altar major ${metrics.finalAltarMajor || "none"}`,
    `final PD ${metrics.finalPdCount}`,
    `deck exhaustion ${metrics.deckExhaustionCount}`,
  ].join("\n");
}

export function formatL03Batch(stats: L03BatchStats): string {
  return [
    "L03 BATCH",
    `runs ${stats.runs}`,
    `turnCount ${stats.turnCount}`,
    `config ${stats.name || `${stats.alignmentRule} jump ${stats.maxJump}`}`,
    `players rank6 ${percent(stats.playerRank6Rate)}`,
    `average final rank ${stats.averageFinalRank.toFixed(2)}`,
    `average evolutions ${stats.averageEvolutions.toFixed(2)}`,
    `average water ${stats.averageWater.toFixed(2)}`,
    `average air ${stats.averageAir.toFixed(2)}`,
    `majors seen ${stats.averageMajorsSeen.toFixed(2)}`,
    `major seen rate ${percent(stats.majorSeenRate)}`,
    `to PD ${stats.averagePdSends.toFixed(2)}`,
    `PD surfaces ${stats.averageSurfaces.toFixed(2)}`,
    `major replacements ${stats.averageReplacements.toFixed(2)}`,
    `eclipses ${stats.averageEclipses.toFixed(2)}`,
    `eclipse rate ${percent(stats.eclipseRate)}`,
    `triangulations ${stats.averageTriangulations.toFixed(2)}`,
    `triangulation rate ${percent(stats.triangulationRate)}`,
    `max combined majors ${stats.majorCongestion.toFixed(2)}`,
    "rank distribution",
    formatRankDistribution(stats.rankDistribution),
  ].join("\n");
}

export function formatL03Compare(rows: readonly L03BatchStats[]): string {
  const header = ["config".padEnd(28), "runs".padStart(6), "r6".padStart(8), "eclipse".padStart(9), "triang".padStart(8), "seen".padStart(8), "field".padStart(7)].join(" ");
  const body = rows.map((row) =>
    [
      row.name.padEnd(28),
      String(row.runs).padStart(6),
      percent(row.playerRank6Rate).padStart(8),
      percent(row.eclipseRate).padStart(9),
      percent(row.triangulationRate).padStart(8),
      percent(row.majorSeenRate).padStart(8),
      row.majorCongestion.toFixed(2).padStart(7),
    ].join(" "),
  );
  return ["L03 COMPARE", header, ...body].join("\n");
}

function rates(ranks: readonly number[]): RankRates {
  const result = {} as RankRates;
  for (const rank of LADDER_RANKS) result[rank] = ranks.length ? ranks.filter((value) => value === rank).length / ranks.length : 0;
  return result;
}
