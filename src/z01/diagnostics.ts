import { percent } from "../metrics.js";
import type { L02BatchStats } from "../l02/metrics.js";

export type DiagnosticStatus = "healthy" | "watch" | "problem";
export type DiagnosticLayer = "L02" | "Z03" | "Z04";

/**
 * Readings the lab can classify. L02 fills the first group.
 * Z03 and Z04 add their own keys here and a check in a later catalog.
 * The panel renders whatever findings come back.
 */
export interface DiagnosticSignals {
  rank6Rate?: number;
  stuckOnAceRate?: number;
  averageFinalRank?: number;
  averageEvolutions?: number;
  waterUse?: number;
  airUse?: number;
  deckExhaustion?: number;
  eclipseRate?: number;
  triangulationRate?: number;
  majorSeenRate?: number;
  majorCongestion?: number;
  deathRate?: number;
  challengeFailureRate?: number;
  hpLoss?: number;
}

export type SignalId = keyof DiagnosticSignals;

/** First-pass L02 lab targets. Not a design lock. */
export const L02_DIAGNOSTIC_TARGETS = {
  rank6Rate: { healthy: 0.25, watch: 0.1 },
  stuckOnAceRate: { healthy: 0.2, watch: 0.35 },
  averageFinalRank: { healthy: 3.5, watch: 2.5 },
  averageEvolutions: { healthy: 3, watch: 1.5 },
  waterUse: { healthy: 1, watch: 0.25 },
  airUse: { healthy: 1, watch: 0.25 },
  deckExhaustion: { healthy: 0, watch: 0.25 },
} as const;

export const RESERVED_DIAGNOSTIC_SIGNALS = [
  "eclipseRate",
  "triangulationRate",
  "majorSeenRate",
  "majorCongestion",
  "deathRate",
  "challengeFailureRate",
  "hpLoss",
] as const satisfies readonly SignalId[];

export interface DiagnosticFinding {
  id: SignalId;
  layer: DiagnosticLayer;
  label: string;
  status: DiagnosticStatus;
  value: number;
  text: string;
}

export interface DiagnosticCheck {
  id: SignalId;
  layer: DiagnosticLayer;
  label: string;
  classify: (value: number) => DiagnosticStatus;
  describe: (value: number, status: DiagnosticStatus) => string;
}

const targets = L02_DIAGNOSTIC_TARGETS;

export const L02_DIAGNOSTIC_CHECKS: readonly DiagnosticCheck[] = [
  {
    id: "rank6Rate",
    layer: "L02",
    label: "rank 6 rate",
    classify: (value) => higher(value, targets.rank6Rate.healthy, targets.rank6Rate.watch),
    describe: (value, status) =>
      status === "healthy"
        ? `Healthy: rank 6 rate is ${percent(value)}, at the 25% target.`
        : status === "watch"
          ? `Watch: rank 6 rate is ${percent(value)}, below the 25% target.`
          : `Problem: rank 6 rate is ${percent(value)}, below the 10% floor.`,
  },
  {
    id: "stuckOnAceRate",
    layer: "L02",
    label: "stuck on Ace",
    classify: (value) => lower(value, targets.stuckOnAceRate.healthy, targets.stuckOnAceRate.watch),
    describe: (value, status) => {
      const rate = percent(value);
      if (status === "healthy") return `Healthy: ${rate} of players are still on Ace.`;
      if (status === "watch") return `Watch: ${rate} of players are still on Ace.`;
      return `Problem: ${rate} of players are still on Ace.`;
    },
  },
  {
    id: "averageFinalRank",
    layer: "L02",
    label: "average final rank",
    classify: (value) => higher(value, targets.averageFinalRank.healthy, targets.averageFinalRank.watch),
    describe: (value, status) =>
      status === "healthy"
        ? `Healthy: average final rank is ${value.toFixed(2)}, at the 3.5 target.`
        : status === "watch"
          ? `Watch: average final rank is ${value.toFixed(2)}, below the 3.5 target.`
          : `Problem: average final rank is ${value.toFixed(2)}, below the 2.5 floor.`,
  },
  {
    id: "averageEvolutions",
    layer: "L02",
    label: "average evolutions",
    classify: (value) => higher(value, targets.averageEvolutions.healthy, targets.averageEvolutions.watch),
    describe: (value, status) =>
      status === "healthy"
        ? `Healthy: average evolutions are ${value.toFixed(2)}, at the 3.0 target.`
        : status === "watch"
          ? `Watch: average evolutions are ${value.toFixed(2)}, below the 3.0 target.`
          : `Problem: average evolutions are ${value.toFixed(2)}, below the 1.5 floor.`,
  },
  {
    id: "waterUse",
    layer: "L02",
    label: "Water use",
    classify: (value) => higher(value, targets.waterUse.healthy, targets.waterUse.watch),
    describe: (value, status) => effectLine("Water", value, status),
  },
  {
    id: "airUse",
    layer: "L02",
    label: "Air use",
    classify: (value) => higher(value, targets.airUse.healthy, targets.airUse.watch),
    describe: (value, status) => effectLine("Air", value, status),
  },
  {
    id: "deckExhaustion",
    layer: "L02",
    label: "deck exhaustion",
    classify: (value) => lower(value, targets.deckExhaustion.healthy, targets.deckExhaustion.watch),
    describe: (value, status) => {
      if (status === "healthy") return "Healthy: deck exhaustion is 0.";
      if (status === "watch") return `Watch: deck exhaustion averages ${value.toFixed(2)}.`;
      return `Problem: deck exhaustion averages ${value.toFixed(2)}, above the 0.25 ceiling.`;
    },
  },
];

export function higher(value: number, healthyAt: number, watchAt: number): DiagnosticStatus {
  if (value >= healthyAt) return "healthy";
  if (value >= watchAt) return "watch";
  return "problem";
}

export function lower(value: number, healthyAt: number, watchAt: number): DiagnosticStatus {
  if (value <= healthyAt) return "healthy";
  if (value <= watchAt) return "watch";
  return "problem";
}

export function diagnose(signals: DiagnosticSignals, checks: readonly DiagnosticCheck[] = L02_DIAGNOSTIC_CHECKS): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  for (const check of checks) {
    const value = signals[check.id];
    if (typeof value !== "number") continue;
    const status = check.classify(value);
    findings.push({
      id: check.id,
      layer: check.layer,
      label: check.label,
      status,
      value,
      text: check.describe(value, status),
    });
  }
  return findings;
}

export function signalsFromL02(stats: L02BatchStats): DiagnosticSignals {
  return {
    rank6Rate: stats.playerRank6Rate,
    stuckOnAceRate: stats.rankDistribution.overall[1],
    averageFinalRank: stats.averageFinalRank,
    averageEvolutions: stats.averageEvolutions,
    waterUse: stats.averageWater,
    airUse: stats.averageAir,
    deckExhaustion: stats.averageDeckExhaustion,
  };
}

/** Compact sentences for the lab and the stats channel. Water and Air share one healthy line. */
export function diagnosticSummary(findings: readonly DiagnosticFinding[]): string[] {
  const water = findings.find((finding) => finding.id === "waterUse");
  const air = findings.find((finding) => finding.id === "airUse");
  const combineEffects = water?.status === "healthy" && air?.status === "healthy";
  const lines: string[] = [];
  for (const finding of findings) {
    if (combineEffects && finding.id === "waterUse") {
      lines.push("Healthy: Water and Air effects are being used.");
      continue;
    }
    if (combineEffects && finding.id === "airUse") continue;
    lines.push(finding.text);
  }
  return lines;
}

const EXTREME_IDS = ["rank6Rate", "averageFinalRank", "averageEvolutions", "waterUse", "airUse"] as const;

export interface CompareExtreme {
  id: (typeof EXTREME_IDS)[number];
  label: string;
  bestName: string;
  bestValue: string;
  worstName: string;
  worstValue: string;
}

export interface NamedSignals {
  name: string;
  signals: DiagnosticSignals;
}

export function compareSpread(rows: readonly NamedSignals[]): { extremes: CompareExtreme[]; problemLines: string[] } {
  const extremes = EXTREME_IDS.map((id) => extremeFor(id, rows));
  const problemLines = rows.flatMap((row) => {
    const problems = diagnose(row.signals).filter((finding) => finding.status === "problem");
    if (!problems.length) return [];
    return [`Problem: ${row.name} — ${problems.map((finding) => finding.label).join(", ")}.`];
  });
  return { extremes, problemLines };
}

function extremeFor(id: (typeof EXTREME_IDS)[number], rows: readonly NamedSignals[]): CompareExtreme {
  const label = L02_DIAGNOSTIC_CHECKS.find((check) => check.id === id)?.label ?? id;
  const scored = rows.flatMap((row) => {
    const value = row.signals[id];
    return typeof value === "number" ? [{ name: row.name, value }] : [];
  });
  const format = id === "rank6Rate" ? percent : (value: number) => value.toFixed(2);
  if (!scored.length) {
    return { id, label, bestName: "—", bestValue: "—", worstName: "—", worstValue: "—" };
  }
  const best = scored.reduce((winner, row) => (row.value > winner.value ? row : winner));
  const worst = scored.reduce((loser, row) => (row.value < loser.value ? row : loser));
  return {
    id,
    label,
    bestName: best.name,
    bestValue: format(best.value),
    worstName: worst.name,
    worstValue: format(worst.value),
  };
}

function effectLine(name: "Water" | "Air", value: number, status: DiagnosticStatus): string {
  const shown = value.toFixed(2);
  if (status === "healthy") return `Healthy: ${name} use is ${shown}, at the 1.0 target.`;
  if (status === "watch") return `Watch: ${name} use is ${shown}, below the 1.0 target.`;
  return `Problem: ${name} use is ${shown}, below the 0.25 floor.`;
}
