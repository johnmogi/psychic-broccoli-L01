import { formatCard, type Element, type MinorCard } from "../cards.js";
import type { AlignmentRule, MaxJump } from "../config.js";

export interface CardSnap {
  id: string;
  rank: number;
  element: Element;
}

export type L02Event =
  | {
      type: "SETUP";
      seed: string;
      turnCount: number;
      alignmentRule: AlignmentRule;
      maxJump: MaxJump;
      players: { id: string; lineage: CardSnap[]; hand: CardSnap[] }[];
      roundTable: CardSnap[];
      deckCount: number;
    }
  | { type: "TURN_START"; turn: number; playerId: string }
  | { type: "REFILL"; turn: number; slots: { index: number; card: CardSnap }[] }
  | { type: "DECK_EXHAUSTED"; turn: number; emptySlots: number[] }
  | { type: "COLLECT"; turn: number; playerId: string; card: CardSnap }
  | {
      type: "EVOLUTION";
      turn: number;
      playerId: string;
      source: "hand";
      from: CardSnap;
      to: CardSnap;
      rankJump: number;
      alignmentMatch: "element" | "color";
    }
  | { type: "WATER_SPEND"; turn: number; playerId: string; card: CardSnap }
  | { type: "RESURFACE"; turn: number; card: CardSnap }
  | { type: "AIR_SPEND"; turn: number; playerId: string; card: CardSnap }
  | { type: "SWAP"; turn: number; slot: number; fromVeil: CardSnap; fromTable: CardSnap }
  | { type: "TO_ALTAR"; turn: number; card: CardSnap; reason: "uncollected" | "resurface" }
  | { type: "TO_VEIL"; turn: number; card: CardSnap; reason: "altar-overflow" | "spend" | "swap-out" }
  | { type: "HAND_SNAPSHOT"; turn: number; playerId: string; size: number }
  | { type: "COMPLETE"; completedTurns: number };

export function snap(card: MinorCard): CardSnap {
  return { id: card.id, rank: card.rank, element: card.element };
}

export function formatL02Log(events: readonly L02Event[]): string {
  const lines: string[] = [];
  for (const event of events) {
    switch (event.type) {
      case "SETUP":
        lines.push(`SEED ${event.seed}`);
        lines.push(`L02 TURNS ${event.turnCount}`);
        lines.push(`ALIGNMENT ${event.alignmentRule}`);
        lines.push(`MAX JUMP ${event.maxJump}`);
        lines.push("SETUP");
        for (const player of event.players) {
          lines.push(`${player.id} lineage ${list(player.lineage)}`);
          lines.push(`${player.id} hand ${list(player.hand)}`);
        }
        lines.push(`Round table ${list(event.roundTable)}`);
        lines.push(`Deck ${event.deckCount}`);
        break;
      case "TURN_START":
        lines.push(`TURN ${event.turn} ${event.playerId}`);
        break;
      case "REFILL":
        lines.push(`REFILL ${event.slots.map((slot) => `${slot.index}:${formatCard(slot.card)}`).join(", ")}`);
        break;
      case "DECK_EXHAUSTED":
        lines.push(`DECK EXHAUSTED slots ${event.emptySlots.join(", ")}`);
        break;
      case "COLLECT":
        lines.push(`COLLECT ${formatCard(event.card)}`);
        break;
      case "EVOLUTION":
        lines.push(`EVOLVE hand ${formatCard(event.from)} -> ${formatCard(event.to)} (jump ${event.rankJump}, ${event.alignmentMatch})`);
        break;
      case "WATER_SPEND":
        lines.push(`WATER SPEND ${formatCard(event.card)}`);
        break;
      case "RESURFACE":
        lines.push(`RESURFACE ${formatCard(event.card)}`);
        break;
      case "AIR_SPEND":
        lines.push(`AIR SPEND ${formatCard(event.card)}`);
        break;
      case "SWAP":
        lines.push(`SWAP slot ${event.slot} ${formatCard(event.fromTable)} <-> ${formatCard(event.fromVeil)}`);
        break;
      case "TO_ALTAR":
        lines.push(`ALTAR ${formatCard(event.card)} (${event.reason})`);
        break;
      case "TO_VEIL":
        lines.push(`VEIL ${formatCard(event.card)} (${event.reason})`);
        break;
      case "HAND_SNAPSHOT":
        lines.push(`${event.playerId} hand size ${event.size}`);
        break;
      case "COMPLETE":
        lines.push("L02 COMPLETE");
        lines.push(`completed turns ${event.completedTurns}`);
        break;
      default:
        break;
    }
  }
  return lines.join("\n");
}

function list(cards: readonly CardSnap[]): string {
  return cards.map((card) => formatCard(card)).join(", ");
}
