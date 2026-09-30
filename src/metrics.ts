import type { GameEvent } from "./events.js";

export interface SingleRunMetrics {
  seed: string;
  turnCount: number;
  completedTurns: number;
  finalTopRank: Record<string, number>;
  reachedRank6: Record<string, boolean>;
  totalEvolutions: number;
  evolutionsPerPlayer: Record<string, number>;
  cardsFromHand: number;
  cardsFromEncounter: number;
  unusedEncountersToAltar: number;
  altarOverflows: number;
  veilCount: number;
  finalAltarMinorCount: number;
  finalDeckCount: number;
}

export interface BatchStats {
  runs: number;
  turnCount: number;
  alignmentRule: string;
  maxJump: number;
  maxEvolutionsPerTurn: number | "unlimited";
  p1Rank6Rate: number;
  p2Rank6Rate: number;
  playerRank6Rate: number;
  averageFinalRank: number;
  averageEvolutions: number;
  averageAltarSends: number;
  averageOverflows: number;
  averageVeil: number;
}

export function metricsFromEvents(events: readonly GameEvent[]): SingleRunMetrics {
  const setup = events.find((event) => event.type === "SETUP");
  const complete = events.find((event) => event.type === "COMPLETE");
  if (!setup || setup.type !== "SETUP") throw new Error("Metrics require a SETUP event");
  if (!complete || complete.type !== "COMPLETE") throw new Error("Metrics require a COMPLETE event");

  const finalTopRank: Record<string, number> = {};
  const evolutionsPerPlayer: Record<string, number> = {};
  for (const player of setup.players) {
    const top = player.lineage[player.lineage.length - 1];
    if (!top) throw new Error(`${player.id} setup lineage is empty`);
    finalTopRank[player.id] = top.rank;
    evolutionsPerPlayer[player.id] = 0;
  }

  let cardsFromHand = 0;
  let cardsFromEncounter = 0;
  let unusedEncountersToAltar = 0;
  let altarOverflows = 0;
  let drawn = 0;

  for (const event of events) {
    if (event.type === "EVOLUTION") {
      finalTopRank[event.playerId] = event.to.rank;
      evolutionsPerPlayer[event.playerId] = (evolutionsPerPlayer[event.playerId] ?? 0) + 1;
      if (event.source === "hand") cardsFromHand += 1;
      else cardsFromEncounter += 1;
    } else if (event.type === "TO_ALTAR") unusedEncountersToAltar += 1;
    else if (event.type === "TO_VEIL") altarOverflows += 1;
    else if (event.type === "REFILL") drawn += event.slots.length;
  }

  const reachedRank6 = Object.fromEntries(Object.entries(finalTopRank).map(([id, rank]) => [id, rank === 6]));
  const totalEvolutions = Object.values(evolutionsPerPlayer).reduce((sum, count) => sum + count, 0);

  return {
    seed: setup.seed,
    turnCount: setup.turnCount,
    completedTurns: complete.completedTurns,
    finalTopRank,
    reachedRank6,
    totalEvolutions,
    evolutionsPerPlayer,
    cardsFromHand,
    cardsFromEncounter,
    unusedEncountersToAltar,
    altarOverflows,
    veilCount: altarOverflows,
    finalAltarMinorCount: unusedEncountersToAltar - altarOverflows,
    finalDeckCount: setup.deckCount - drawn,
  };
}

export function aggregate(runs: readonly SingleRunMetrics[]): BatchStats {
  if (!runs.length) throw new Error("Batch stats require at least one run");
  const first = runs[0]!;
  const count = runs.length;
  const players = count * 2;
  const mean = (pick: (metrics: SingleRunMetrics) => number) => runs.reduce((sum, metrics) => sum + pick(metrics), 0) / count;
  const p1Hits = runs.filter((metrics) => metrics.reachedRank6["P1"]).length;
  const p2Hits = runs.filter((metrics) => metrics.reachedRank6["P2"]).length;
  const rankSum = runs.reduce((sum, metrics) => sum + (metrics.finalTopRank["P1"] ?? 0) + (metrics.finalTopRank["P2"] ?? 0), 0);

  return {
    runs: count,
    turnCount: first.turnCount,
    alignmentRule: "",
    maxJump: 0,
    maxEvolutionsPerTurn: "unlimited",
    p1Rank6Rate: p1Hits / count,
    p2Rank6Rate: p2Hits / count,
    playerRank6Rate: (p1Hits + p2Hits) / players,
    averageFinalRank: rankSum / players,
    averageEvolutions: mean((metrics) => metrics.totalEvolutions),
    averageAltarSends: mean((metrics) => metrics.unusedEncountersToAltar),
    averageOverflows: mean((metrics) => metrics.altarOverflows),
    averageVeil: mean((metrics) => metrics.veilCount),
  };
}

export function formatMetrics(metrics: SingleRunMetrics): string {
  return [
    "METRICS",
    `seed ${metrics.seed}`,
    `turnCount ${metrics.turnCount}`,
    `completedTurns ${metrics.completedTurns}`,
    `P1 top ${metrics.finalTopRank["P1"]} rank6 ${metrics.reachedRank6["P1"]}`,
    `P2 top ${metrics.finalTopRank["P2"]} rank6 ${metrics.reachedRank6["P2"]}`,
    `evolutions ${metrics.totalEvolutions} (P1 ${metrics.evolutionsPerPlayer["P1"]}, P2 ${metrics.evolutionsPerPlayer["P2"]})`,
    `from hand ${metrics.cardsFromHand}`,
    `from encounter ${metrics.cardsFromEncounter}`,
    `altar sends ${metrics.unusedEncountersToAltar}`,
    `altar overflows ${metrics.altarOverflows}`,
    `veil ${metrics.veilCount}`,
    `altar minors ${metrics.finalAltarMinorCount}`,
    `deck ${metrics.finalDeckCount}`,
  ].join("\n");
}

export function formatBatch(stats: BatchStats): string {
  return [
    "BATCH",
    `runs ${stats.runs}`,
    `turnCount ${stats.turnCount}`,
    `config ${stats.alignmentRule} jump ${stats.maxJump} evolutions ${stats.maxEvolutionsPerTurn}`,
    `P1 rank6 ${percent(stats.p1Rank6Rate)}`,
    `P2 rank6 ${percent(stats.p2Rank6Rate)}`,
    `players rank6 ${percent(stats.playerRank6Rate)}`,
    `average final rank ${stats.averageFinalRank.toFixed(2)}`,
    `average evolutions ${stats.averageEvolutions.toFixed(2)}`,
    `average altar sends ${stats.averageAltarSends.toFixed(2)}`,
    `average altar overflow ${stats.averageOverflows.toFixed(2)}`,
    `average veil ${stats.averageVeil.toFixed(2)}`,
  ].join("\n");
}

export function percent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
