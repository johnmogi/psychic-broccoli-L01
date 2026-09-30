import { formatAnyCard, formatCard, type Back, type Court, type Element, type MajorCard, type MinorCard } from "../cards.js";
import type { AlignmentRule, MaxJump } from "../config.js";

export interface MinorSnap {
  id: string;
  rank: number;
  element: Element;
  arcana: "minor";
}

export interface MajorSnap {
  id: string;
  rank: null;
  element: Element;
  arcana: "major";
  court: Court;
  back: Back;
  name: string;
}

export type CardSnap = MinorSnap | MajorSnap;

export type L03Event =
  | {
      type: "SETUP";
      seed: string;
      turnCount: number;
      alignmentRule: AlignmentRule;
      maxJump: MaxJump;
      majorDeckMode: string;
      players: { id: string; lineage: MinorSnap[]; hand: MinorSnap[] }[];
      roundTable: CardSnap[];
      deckCount: number;
      majorCount: number;
    }
  | { type: "TURN_START"; turn: number; playerId: string }
  | { type: "REFILL"; turn: number; slots: { index: number; card: CardSnap }[] }
  | { type: "DECK_EXHAUSTED"; turn: number; emptySlots: number[] }
  | { type: "MAJOR_REVEALED"; turn: number; card: MajorSnap; slot: number }
  | { type: "TO_PD"; turn: number; card: MajorSnap }
  | { type: "PD_SURFACE"; turn: number; card: MajorSnap }
  | { type: "ALTAR_MAJOR"; turn: number; card: MajorSnap }
  | { type: "MAJOR_TO_VEIL"; turn: number; card: MajorSnap; reason: "eclipse" | "replaced" }
  | { type: "MAJOR_REPLACED"; turn: number; older: MajorSnap; newer: MajorSnap }
  | { type: "ECLIPSE"; turn: number; playerId: string; older: MajorSnap; newer: MajorSnap }
  | { type: "TRIANGULATION"; turn: number; count: number; playerId: string }
  | { type: "JOKER_AWARDED"; turn: number; playerId: string; reason: "eclipse" }
  | { type: "TEAM_MILESTONE"; turn: number; playerId: string; reason: "triangulation" }
  | { type: "MAJOR_FIELD"; turn: number; count: number }
  | { type: "COLLECT"; turn: number; playerId: string; card: MinorSnap }
  | {
      type: "EVOLUTION";
      turn: number;
      playerId: string;
      source: "hand";
      from: MinorSnap;
      to: MinorSnap;
      rankJump: number;
      alignmentMatch: "element" | "color";
    }
  | { type: "WATER_SPEND"; turn: number; playerId: string; card: MinorSnap }
  | { type: "RESURFACE"; turn: number; card: MinorSnap }
  | { type: "AIR_SPEND"; turn: number; playerId: string; card: MinorSnap }
  | { type: "SWAP"; turn: number; slot: number; fromVeil: MinorSnap; fromTable: MinorSnap }
  | { type: "TO_ALTAR"; turn: number; card: MinorSnap; reason: "uncollected" | "resurface" }
  | { type: "TO_VEIL"; turn: number; card: MinorSnap; reason: "altar-overflow" | "spend" | "swap-out" }
  | { type: "HAND_SNAPSHOT"; turn: number; playerId: string; size: number }
  | { type: "COMPLETE"; completedTurns: number; maxCombinedMajors: number; teamMilestones: number };

export function snapMinor(card: MinorCard): MinorSnap {
  return { id: card.id, rank: card.rank, element: card.element, arcana: "minor" };
}

export function snapMajor(card: MajorCard): MajorSnap {
  return { id: card.id, rank: null, element: card.element, arcana: "major", court: card.court, back: card.back, name: card.name };
}

export function formatL03Log(events: readonly L03Event[]): string {
  return events.map(line).join("\n");
}

function line(event: L03Event): string {
  switch (event.type) {
    case "SETUP":
      return `SEED ${event.seed}\nL03 TURNS ${event.turnCount}\nMAJORS ${event.majorDeckMode} ${event.majorCount}\nSETUP`;
    case "TURN_START":
      return `TURN ${event.turn} ${event.playerId}`;
    case "REFILL":
      return `REFILL ${event.slots.map((slot) => `${slot.index}:${formatAnyCard(slot.card)}`).join(" ")}`;
    case "DECK_EXHAUSTED":
      return `DECK EXHAUSTED ${event.emptySlots.join(",")}`;
    case "MAJOR_REVEALED":
      return `${formatAnyCard(event.card)} revealed on the Round Table.`;
    case "TO_PD":
      return `${formatAnyCard(event.card)} moved to PD.`;
    case "PD_SURFACE":
      return `${formatAnyCard(event.card)} surfaced to altar.`;
    case "ALTAR_MAJOR":
      return `${formatAnyCard(event.card)} holds the altar.`;
    case "MAJOR_TO_VEIL":
      return `${formatAnyCard(event.card)} moved to Veil (${event.reason}).`;
    case "MAJOR_REPLACED":
      return `${formatAnyCard(event.newer)} replaced ${formatAnyCard(event.older)}.`;
    case "ECLIPSE":
      return `Eclipse: ${courtName(event.older)} met ${courtName(event.newer)}.`;
    case "TRIANGULATION":
      return "Triangulation: three majors converged.";
    case "JOKER_AWARDED":
      return `Joker awarded to ${event.playerId}.`;
    case "TEAM_MILESTONE":
      return `Team milestone for ${event.playerId}.`;
    case "MAJOR_FIELD":
      return `Major field ${event.count}.`;
    case "COLLECT":
      return `COLLECT ${event.playerId} ${formatCard(event.card)}`;
    case "EVOLUTION":
      return `EVOLVE ${event.playerId} ${formatCard(event.from)} -> ${formatCard(event.to)}`;
    case "TO_ALTAR":
      return `ALTAR ${formatCard(event.card)} ${event.reason}`;
    case "TO_VEIL":
      return `VEIL ${formatCard(event.card)} ${event.reason}`;
    case "WATER_SPEND":
      return `WATER ${event.playerId} ${formatCard(event.card)}`;
    case "RESURFACE":
      return `RESURFACE ${formatCard(event.card)}`;
    case "AIR_SPEND":
      return `AIR ${event.playerId} ${formatCard(event.card)}`;
    case "SWAP":
      return `SWAP ${event.slot} ${formatCard(event.fromTable)} <-> ${formatCard(event.fromVeil)}`;
    case "HAND_SNAPSHOT":
      return `HAND ${event.playerId} ${event.size}`;
    case "COMPLETE":
      return `COMPLETE ${event.completedTurns} field ${event.maxCombinedMajors} milestones ${event.teamMilestones}`;
    default:
      return "";
  }
}

function courtName(card: MajorSnap): string {
  const back = `${card.back[0]!.toUpperCase()}${card.back.slice(1)}`;
  const court = `${card.court[0]!.toUpperCase()}${card.court.slice(1)}`;
  return `${back} ${court}`;
}
