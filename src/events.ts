import { formatCard, type Element, type MinorCard } from "./cards.js";
import type { AlignmentRule, MaxJump } from "./config.js";

export interface CardSnap {
  id: string;
  rank: number;
  element: Element;
}

export type GameEvent =
  | {
      type: "SETUP";
      seed: string;
      turnCount: number;
      alignmentRule: AlignmentRule;
      maxJump: MaxJump;
      maxEvolutionsPerTurn: number | "unlimited";
      players: { id: string; lineage: CardSnap[]; hand: CardSnap[] }[];
      roundTable: CardSnap[];
      deckCount: number;
    }
  | { type: "TURN_START"; turn: number; playerId: string }
  | { type: "TO_ALTAR"; turn: number; card: CardSnap; reason: "unused-encounter" }
  | { type: "TO_VEIL"; turn: number; card: CardSnap; reason: "altar-overflow" }
  | { type: "REFILL"; turn: number; slots: { index: number; card: CardSnap }[] }
  | { type: "DECK_EXHAUSTED"; turn: number; emptySlots: number[] }
  | {
      type: "EVOLUTION";
      turn: number;
      playerId: string;
      source: "encounter" | "hand";
      from: CardSnap;
      to: CardSnap;
      rankJump: number;
      alignmentMatch: "element" | "color";
    }
  | { type: "PENDING_ENCOUNTER"; turn: number; card: CardSnap }
  | { type: "COMPLETE"; completedTurns: number };

export function snap(card: MinorCard): CardSnap {
  return { id: card.id, rank: card.rank, element: card.element };
}

export function formatLog(events: readonly GameEvent[]): string {
  const lines: string[] = [];
  for (const event of events) {
    switch (event.type) {
      case "SETUP":
        lines.push(`SEED ${event.seed}`);
        lines.push(`TURNS ${event.turnCount}`);
        lines.push(`ALIGNMENT ${event.alignmentRule}`);
        lines.push(`MAX JUMP ${event.maxJump}`);
        lines.push(`MAX EVOLUTIONS ${event.maxEvolutionsPerTurn}`);
        lines.push("SETUP");
        for (const player of event.players) {
          lines.push(`${player.id} lineage ${formatList(player.lineage)}`);
          lines.push(`${player.id} hand ${formatList(player.hand)}`);
        }
        lines.push(`Round table ${formatList(event.roundTable)}`);
        lines.push(`Deck ${event.deckCount}`);
        break;
      case "TURN_START":
        lines.push(`TURN ${event.turn} ${event.playerId}`);
        break;
      case "TO_ALTAR":
        lines.push(`ALTAR ${formatSnap(event.card)}`);
        break;
      case "TO_VEIL":
        lines.push(`VEIL ${formatSnap(event.card)}`);
        break;
      case "REFILL":
        lines.push(`REFILL ${event.slots.map((slot) => `${slot.index}:${formatSnap(slot.card)}`).join(", ")}`);
        break;
      case "DECK_EXHAUSTED":
        lines.push(`DECK EXHAUSTED slots ${event.emptySlots.join(", ")}`);
        break;
      case "EVOLUTION":
        lines.push(
          `EVOLVE ${event.source} ${formatSnap(event.from)} -> ${formatSnap(event.to)} (jump ${event.rankJump}, ${event.alignmentMatch})`,
        );
        break;
      case "PENDING_ENCOUNTER":
        lines.push(`PENDING ${formatSnap(event.card)}`);
        break;
      case "COMPLETE":
        lines.push("L01 COMPLETE");
        lines.push(`completed turns ${event.completedTurns}`);
        break;
      default:
        break;
    }
  }
  return lines.join("\n");
}

function formatSnap(card: CardSnap): string {
  return formatCard(card);
}

function formatList(cards: readonly CardSnap[]): string {
  return cards.map(formatSnap).join(", ");
}
