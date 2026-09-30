import type { L02State } from "./state.js";
import { activePlayer } from "./state.js";

/**
 * Used only when the turn produced no evolution.
 * Water resurface wins over Air swap. Both require a veil card.
 */
export function chooseVeilEffect(state: L02State): "water" | "air" | null {
  if (state.veil.length === 0) return null;
  const player = activePlayer(state);
  const config = state.config;
  if (config.waterResurfaceEnabled && player.hand.some((card) => card.element === "water")) return "water";
  if (config.airSwapEnabled && player.hand.some((card) => card.element === "air") && state.roundTable.some((card) => card !== null)) {
    return "air";
  }
  return null;
}
