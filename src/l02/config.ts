import type { Element } from "../cards.js";
import type { AlignmentRule, MaxJump } from "../config.js";

export type AltarOverflowMode = "oldest" | "activeChoice";

export interface L02Config {
  turnCount: number;
  alignmentRule: AlignmentRule;
  maxJump: MaxJump;
  startingHand: number;
  handLimit: number | "unlimited";
  altarCapacity: number;
  altarOverflowMode: AltarOverflowMode;
  waterResurfaceEnabled: boolean;
  airSwapEnabled: boolean;
  maxElementalEffectsPerTurn: number;
  startingAces: { P1: Element; P2: Element };
}

export const L02_DEFAULTS: L02Config = {
  turnCount: 6,
  alignmentRule: "sameColor",
  maxJump: 2,
  startingHand: 2,
  handLimit: "unlimited",
  altarCapacity: 3,
  altarOverflowMode: "oldest",
  waterResurfaceEnabled: true,
  airSwapEnabled: true,
  maxElementalEffectsPerTurn: 1,
  startingAces: { P1: "fire", P2: "water" },
};

export function resolveL02Config(partial: Partial<L02Config> = {}): L02Config {
  return {
    ...L02_DEFAULTS,
    ...partial,
    startingAces: { ...L02_DEFAULTS.startingAces, ...partial.startingAces },
  };
}
