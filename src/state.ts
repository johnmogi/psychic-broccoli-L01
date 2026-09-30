import type { MinorCard } from "./cards.js";
import type { L01Config } from "./config.js";
import type { GameEvent } from "./events.js";

export interface PlayerState {
  id: "P1" | "P2";
  lineage: MinorCard[];
  hand: MinorCard[];
}

export interface GameState {
  seed: string;
  config: L01Config;
  status: "running" | "completed";
  completedTurns: number;
  activePlayerIndex: number;
  players: [PlayerState, PlayerState];
  deck: MinorCard[];
  roundTable: [MinorCard | null, MinorCard | null, MinorCard | null];
  pendingCardId: string | null;
  altar: { minors: MinorCard[]; major: null };
  veil: MinorCard[];
  events: GameEvent[];
}

export function topCard(player: PlayerState): MinorCard {
  const card = player.lineage[player.lineage.length - 1];
  if (!card) throw new Error(`${player.id} has an empty lineage`);
  return card;
}
