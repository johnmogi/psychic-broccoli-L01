import type { MinorCard } from "./cards.js";
import { evolutionLimit, type L01Config } from "./config.js";
import { isLegalEvolution } from "./rules.js";
import { topCard, type GameState, type PlayerState } from "./state.js";

export interface EvolutionPick {
  card: MinorCard;
  source: "encounter" | "hand";
}

/** Encounter first, then hand order. One pick. The caller repeats. */
export function nextEvolution(state: GameState, player: PlayerState, encounterId: string | null): EvolutionPick | null {
  const top = topCard(player);
  const config: Pick<L01Config, "alignmentRule" | "maxJump"> = state.config;
  if (encounterId) {
    const encounter = state.roundTable.find((card) => card?.id === encounterId) ?? null;
    if (encounter && isLegalEvolution(top, encounter, config)) return { card: encounter, source: "encounter" };
  }
  for (const card of player.hand) {
    if (isLegalEvolution(top, card, config)) return { card, source: "hand" };
  }
  return null;
}

export function canContinue(used: number, config: L01Config): boolean {
  return used < evolutionLimit(config);
}
