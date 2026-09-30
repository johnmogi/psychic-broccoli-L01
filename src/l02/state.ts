import type { MinorCard } from "../cards.js";
import { topCard, type PlayerState } from "../state.js";
import type { L02Config } from "./config.js";
import type { L02Event } from "./events.js";

export interface L02State {
  seed: string;
  config: L02Config;
  status: "running" | "completed";
  completedTurns: number;
  activePlayerIndex: number;
  players: [PlayerState, PlayerState];
  deck: MinorCard[];
  roundTable: [MinorCard | null, MinorCard | null, MinorCard | null];
  altar: { minors: MinorCard[]; major: null };
  veil: MinorCard[];
  events: L02Event[];
}

export function activePlayer(state: L02State): PlayerState {
  const player = state.players[state.activePlayerIndex];
  if (!player) throw new Error("Active player is missing");
  return player;
}

export { topCard };
