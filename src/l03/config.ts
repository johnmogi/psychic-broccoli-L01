import type { Element } from "../cards.js";
import type { AlignmentRule, MaxJump } from "../config.js";
import type { AltarOverflowMode } from "../l02/config.js";

export type EclipseMode = "sameRankOppositeBack";
export type TriangulationMode = "sameRankMajorSet" | "anyThreeMajors";
export type MajorOverflowMode = "newestStays" | "activeChoice";
export type MajorDeckMode = "full" | "scripted";

export interface L03Config {
  turnCount: number;
  alignmentRule: AlignmentRule;
  maxJump: MaxJump;
  startingHand: number;
  handLimit: number | "unlimited";
  altarMinorCapacity: number;
  altarMajorCapacity: number;
  altarOverflowMode: AltarOverflowMode;
  waterResurfaceEnabled: boolean;
  airSwapEnabled: boolean;
  maxElementalEffectsPerTurn: number;
  startingAces: { P1: Element; P2: Element };
  majorsEnabled: boolean;
  pdEnabled: boolean;
  eclipseEnabled: boolean;
  triangulationEnabled: boolean;
  eclipseMode: EclipseMode;
  triangulationMode: TriangulationMode;
  majorDeckMode: MajorDeckMode;
  majorOverflowMode: MajorOverflowMode;
  /** Typed only. True rejects until a later layer implements the choice. */
  highLevelMajorChoice: boolean;
  /** Arranged at the front of the deck. The rest of the 24-major catalog still follows. */
  scriptedMajorIds: string[];
}

export const L03_DEFAULTS: L03Config = {
  turnCount: 9,
  alignmentRule: "sameColor",
  maxJump: 2,
  startingHand: 2,
  handLimit: "unlimited",
  altarMinorCapacity: 3,
  altarMajorCapacity: 1,
  altarOverflowMode: "oldest",
  waterResurfaceEnabled: true,
  airSwapEnabled: true,
  maxElementalEffectsPerTurn: 1,
  startingAces: { P1: "fire", P2: "water" },
  majorsEnabled: true,
  pdEnabled: true,
  eclipseEnabled: true,
  triangulationEnabled: true,
  eclipseMode: "sameRankOppositeBack",
  triangulationMode: "sameRankMajorSet",
  majorDeckMode: "full",
  majorOverflowMode: "newestStays",
  highLevelMajorChoice: false,
  scriptedMajorIds: [],
};

export function resolveL03Config(partial: Partial<L03Config> = {}): L03Config {
  return {
    ...L03_DEFAULTS,
    ...partial,
    startingAces: { ...L03_DEFAULTS.startingAces, ...partial.startingAces },
    scriptedMajorIds: partial.scriptedMajorIds ?? L03_DEFAULTS.scriptedMajorIds,
  };
}
