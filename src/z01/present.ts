import type { L02BatchStats } from "../l02/metrics.js";
import { LADDER_RANKS, percent, type RankDistribution } from "../metrics.js";
import {
  compareSpread,
  diagnose,
  diagnosticSummary,
  RESERVED_DIAGNOSTIC_SIGNALS,
  signalsFromL02,
  type DiagnosticSignals,
  type DiagnosticStatus,
} from "./diagnostics.js";

export interface LabLine {
  status: DiagnosticStatus;
  text: string;
}

export interface LabMeter {
  id: string;
  label: string;
  value: string;
  fraction: number | null;
}

export interface RankBar {
  label: string;
  fraction: number;
  value: string;
}

export interface RankChart {
  seat: string;
  bars: RankBar[];
}

export interface PressureRow {
  id: string;
  label: string;
  value: string;
}

export interface CompareRow {
  name: string;
  status: DiagnosticStatus;
  best: boolean;
  problem: boolean;
  cells: LabMeter[];
}

export interface LabPresentation {
  kind: "batch" | "compare";
  findings: LabLine[];
  meters: LabMeter[];
  ranks: RankChart[];
  pressure: PressureRow[];
  compare: CompareRow[];
  slots: LabMeter[];
}

const STATUS_ORDER: Record<DiagnosticStatus, number> = { problem: 0, watch: 1, healthy: 2 };

const SLOT_LABELS: Record<(typeof RESERVED_DIAGNOSTIC_SIGNALS)[number], string> = {
  eclipseRate: "Eclipse rate",
  triangulationRate: "Triangulation rate",
  majorSeenRate: "Major seen rate",
  majorCongestion: "Major congestion",
  deathRate: "Death rate",
  challengeFailureRate: "Challenge failure rate",
  hpLoss: "HP loss",
};

export function orderedDiagnosticLines(findings: Parameters<typeof diagnosticSummary>[0]): LabLine[] {
  return diagnosticSummary(findings)
    .map((text) => ({ status: lineStatus(text), text }))
    .sort((left, right) => STATUS_ORDER[left.status] - STATUS_ORDER[right.status]);
}

export function futureSlots(signals: DiagnosticSignals): LabMeter[] {
  return RESERVED_DIAGNOSTIC_SIGNALS.flatMap((id) => {
    const value = signals[id];
    if (typeof value !== "number") return [];
    const rate = id === "hpLoss" || id === "majorCongestion";
    return [{ id, label: SLOT_LABELS[id], value: rate ? value.toFixed(2) : percent(value), fraction: rate ? null : value }];
  });
}

export function presentBatch(stats: L02BatchStats, extra: DiagnosticSignals = {}): LabPresentation {
  const signals = { ...signalsFromL02(stats), ...extra };
  return {
    kind: "batch",
    findings: orderedDiagnosticLines(diagnose(signals)),
    meters: batchMeters(stats),
    ranks: rankCharts(stats.rankDistribution),
    pressure: pressureRows(stats),
    compare: [],
    slots: futureSlots(signals),
  };
}

export function presentCompare(rows: readonly (L02BatchStats & { name: string })[]): LabPresentation {
  const named = rows.map((row) => ({ name: row.name, signals: signalsFromL02(row) }));
  const spread = compareSpread(named);
  const bestName = spread.extremes.find((item) => item.id === "rank6Rate")?.bestName ?? "";
  const compare = rows.map((row) => {
    const findings = diagnose(signalsFromL02(row));
    const problem = findings.some((finding) => finding.status === "problem");
    const watch = findings.some((finding) => finding.status === "watch");
    return {
      name: row.name,
      status: problem ? "problem" as const : watch ? "watch" as const : "healthy" as const,
      best: row.name === bestName,
      problem,
      cells: compareCells(row),
    };
  });
  const findings: LabLine[] = [
    ...spread.problemLines.map((text) => ({ status: "problem" as const, text })),
  ];
  const best = compare.find((row) => row.best);
  const bestCell = best?.cells.find((cell) => cell.id === "rank6Rate");
  if (best && bestCell) {
    findings.push({ status: best.status, text: `Best rank 6: ${best.name} ${bestCell.value}.` });
  }
  return {
    kind: "compare",
    findings,
    meters: [],
    ranks: [],
    pressure: [],
    compare,
    slots: futureSlots(named[0]?.signals ?? {}),
  };
}

export function batchMeters(stats: L02BatchStats): LabMeter[] {
  return [
    meter("rank6Rate", "Rank 6", percent(stats.playerRank6Rate), stats.playerRank6Rate),
    meter("averageFinalRank", "Average final rank", stats.averageFinalRank.toFixed(2), stats.averageFinalRank / 6),
    meter("averageEvolutions", "Average evolutions", stats.averageEvolutions.toFixed(2), null),
    meter("stuckOnAceRate", "Stuck on Ace", percent(stats.rankDistribution.overall[1]), stats.rankDistribution.overall[1]),
    meter("altarOverflow", "Altar overflows", stats.averageOverflows.toFixed(2), null),
    meter("waterUse", "Water", stats.averageWater.toFixed(2), null),
    meter("airUse", "Air", stats.averageAir.toFixed(2), null),
    meter("deckExhaustion", "Deck exhaustion", stats.averageDeckExhaustion.toFixed(2), null),
  ];
}

export function rankCharts(distribution: RankDistribution): RankChart[] {
  return (["overall", "P1", "P2"] as const).map((seat) => ({
    seat: seat === "overall" ? "Overall" : seat,
    bars: LADDER_RANKS.map((rank) => ({
      label: rank === 1 ? "A" : String(rank),
      fraction: distribution[seat][rank],
      value: percent(distribution[seat][rank]),
    })),
  }));
}

export function pressureRows(stats: L02BatchStats): PressureRow[] {
  return [
    {
      id: "veil",
      label: "Veil pressure",
      value: `${stats.averageVeil.toFixed(2)} veil · ${stats.averageOverflows.toFixed(2)} overflow`,
    },
    {
      id: "recovery",
      label: "Recovery activity",
      value: `Water ${stats.averageWater.toFixed(2)} · Air ${stats.averageAir.toFixed(2)}`,
    },
    {
      id: "progression",
      label: "Progression health",
      value: `rank 6 ${percent(stats.playerRank6Rate)} · avg rank ${stats.averageFinalRank.toFixed(2)} · Ace ${percent(stats.rankDistribution.overall[1])}`,
    },
  ];
}

function compareCells(stats: L02BatchStats): LabMeter[] {
  return [
    meter("rank6Rate", "Rank 6", percent(stats.playerRank6Rate), stats.playerRank6Rate),
    meter("averageFinalRank", "Avg rank", stats.averageFinalRank.toFixed(2), stats.averageFinalRank / 6),
    meter("averageEvolutions", "Evolutions", stats.averageEvolutions.toFixed(2), null),
    meter("waterUse", "Water", stats.averageWater.toFixed(2), null),
    meter("airUse", "Air", stats.averageAir.toFixed(2), null),
    ...futureSlots(signalsFromL02(stats)),
  ];
}

function meter(id: string, label: string, value: string, fraction: number | null): LabMeter {
  return { id, label, value, fraction };
}

function lineStatus(text: string): DiagnosticStatus {
  if (text.startsWith("Problem")) return "problem";
  if (text.startsWith("Watch")) return "watch";
  return "healthy";
}
