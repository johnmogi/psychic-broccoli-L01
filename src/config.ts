import type { Element } from "./cards.js";

export type AlignmentRule = "sameColor" | "sameElement";
export type MaxJump = 1 | 2;

export interface L01Config {
  turnCount: number;
  alignmentRule: AlignmentRule;
  maxJump: MaxJump;
  maxEvolutionsPerTurn: number | "unlimited";
  startingAces: { P1: Element; P2: Element };
}

export const ALTAR_MINOR_CAPACITY = 3;

export const L01_DEFAULTS: L01Config = {
  turnCount: 4,
  alignmentRule: "sameColor",
  maxJump: 2,
  maxEvolutionsPerTurn: "unlimited",
  startingAces: { P1: "fire", P2: "water" },
};

export const COMPARE_PRESETS = [
  { name: "sameColor/+2", alignmentRule: "sameColor" as const, maxJump: 2 as const },
  { name: "sameColor/+1", alignmentRule: "sameColor" as const, maxJump: 1 as const },
  { name: "sameElement/+2", alignmentRule: "sameElement" as const, maxJump: 2 as const },
  { name: "sameElement/+1", alignmentRule: "sameElement" as const, maxJump: 1 as const },
];

export function resolveConfig(partial: Partial<L01Config> = {}): L01Config {
  return {
    ...L01_DEFAULTS,
    ...partial,
    startingAces: { ...L01_DEFAULTS.startingAces, ...partial.startingAces },
  };
}

export function evolutionLimit(config: L01Config): number {
  return config.maxEvolutionsPerTurn === "unlimited" ? Number.POSITIVE_INFINITY : config.maxEvolutionsPerTurn;
}
