import { createL01Pool, type Element, type MinorCard } from "./cards.js";
import { L01_DEFAULTS } from "./config.js";
import { completeRun } from "./engine.js";
import { snap } from "./events.js";
import type { GameState } from "./state.js";

export const GOLDEN_SEED = "tutorial";

/**
 * A fixed 4-turn lesson. P1 changes element and both players finish on rank 6.
 * The rest of the deck is ordered by id so the lesson does not depend on a shuffle.
 */
export function playGoldenTutorial(): GameState {
  const pool = createL01Pool();
  const take = (element: Element, rank: number) => {
    const index = pool.findIndex((card) => card.element === element && card.rank === rank);
    if (index < 0) throw new Error(`Tutorial card ${element} ${rank} is missing`);
    return pool.splice(index, 1)[0]!;
  };
  const players: GameState["players"] = [
    { id: "P1", lineage: [take("fire", 1)], hand: [take("air", 2), take("fire", 4)] },
    { id: "P2", lineage: [take("water", 1)], hand: [take("earth", 2), take("water", 5)] },
  ];
  const roundTable: GameState["roundTable"] = [take("air", 3), take("fire", 6), take("earth", 4)];
  const deck = [take("water", 3), take("air", 6), take("water", 6), ...pool.sort((a, b) => a.id.localeCompare(b.id))];
  const config = { ...L01_DEFAULTS, turnCount: 4 };
  const state: GameState = {
    seed: GOLDEN_SEED,
    config,
    status: "running",
    completedTurns: 0,
    activePlayerIndex: 0,
    players,
    deck,
    roundTable,
    pendingCardId: null,
    altar: { minors: [], major: null },
    veil: [],
    events: [
      {
        type: "SETUP",
        seed: GOLDEN_SEED,
        turnCount: config.turnCount,
        alignmentRule: config.alignmentRule,
        maxJump: config.maxJump,
        maxEvolutionsPerTurn: config.maxEvolutionsPerTurn,
        players: players.map((player) => ({
          id: player.id,
          lineage: player.lineage.map(snap),
          hand: player.hand.map(snap),
        })),
        roundTable: roundTable.filter((card): card is MinorCard => card !== null).map(snap),
        deckCount: deck.length,
      },
    ],
  };
  return completeRun(state);
}
