import type { MajorCard, MinorCard } from "../cards.js";
import { topCard, type PlayerState } from "../state.js";
import type { L03Config } from "./config.js";
import type { L03Event } from "./events.js";

export type TableCard = MinorCard | MajorCard;

export interface L03State {
  seed: string;
  config: L03Config;
  status: "running" | "completed";
  completedTurns: number;
  activePlayerIndex: number;
  players: [PlayerState, PlayerState];
  deck: TableCard[];
  roundTable: [TableCard | null, TableCard | null, TableCard | null];
  pd: MajorCard | null;
  altar: { minors: MinorCard[]; major: MajorCard | null };
  veil: TableCard[];
  teamMilestones: number;
  maxCombinedMajors: number;
  /** True while the combined major field is already at a triangulation trigger. */
  triangulationOpen: boolean;
  events: L03Event[];
}

export function activePlayer(state: L03State): PlayerState {
  const player = state.players[state.activePlayerIndex];
  if (!player) throw new Error("Active player is missing");
  return player;
}

export function isMajor(card: TableCard | null | undefined): card is MajorCard {
  return !!card && card.arcana === "major";
}

export function isMinor(card: TableCard | null | undefined): card is MinorCard {
  return !!card && card.arcana === "minor";
}

export { topCard };
