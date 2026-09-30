import { createL01Pool, type Element, type MinorCard } from "./cards.js";
import { ALTAR_MINOR_CAPACITY, resolveConfig, type L01Config } from "./config.js";
import { alignmentMatch } from "./rules.js";
import { canContinue, nextEvolution } from "./bot.js";
import { snap, type GameEvent } from "./events.js";
import { shuffle } from "./rng.js";
import { topCard, type GameState, type PlayerState } from "./state.js";
import { noteBoard } from "./z01/capture.js";

export function playGame(seed: string, partial: Partial<L01Config> = {}): GameState {
  const config = resolveConfig(partial);
  if (!Number.isInteger(config.turnCount) || config.turnCount < 1) throw new Error("turnCount must be an integer of at least 1");
  return completeRun(setup(seed, config));
}

export function completeRun(state: GameState): GameState {
  let current = state;
  while (current.completedTurns < current.config.turnCount) current = resolveTurn(current);
  current.status = "completed";
  emit(current, { type: "COMPLETE", completedTurns: current.completedTurns });
  return current;
}

export function resolveTurn(state: GameState): GameState {
  const next = structuredClone(state) as GameState;
  const turn = next.completedTurns + 1;
  const player = next.players[next.activePlayerIndex]!;
  emit(next, { type: "TURN_START", turn, playerId: player.id });

  if (next.pendingCardId) {
    const slot = next.roundTable.findIndex((card) => card?.id === next.pendingCardId);
    if (slot < 0) throw new Error("Pending encounter is not on the round table");
    const card = next.roundTable[slot]!;
    next.roundTable[slot] = null;
    next.pendingCardId = null;
    sendToAltar(next, turn, card);
  }

  refill(next, turn);

  const encounter = leftmost(next.roundTable);
  const encounterId = encounter?.id ?? null;
  let used = 0;
  while (canContinue(used, next.config)) {
    const pick = nextEvolution(next, player, encounterId);
    if (!pick) break;
    evolve(next, turn, player, pick);
    used += 1;
  }

  if (encounterId && next.roundTable.some((card) => card?.id === encounterId)) {
    const card = next.roundTable.find((entry) => entry?.id === encounterId)!;
    next.pendingCardId = encounterId;
    emit(next, { type: "PENDING_ENCOUNTER", turn, card: snap(card) });
  }

  next.completedTurns = turn;
  next.activePlayerIndex = next.activePlayerIndex === 0 ? 1 : 0;
  return next;
}

function setup(seed: string, config: L01Config): GameState {
  const pool = createL01Pool();
  const p1Ace = takeAce(pool, config.startingAces.P1);
  const p2Ace = takeAce(pool, config.startingAces.P2);
  const shuffled = shuffle(pool, seed);
  const p1Hand = shuffled.splice(0, 2);
  const p2Hand = shuffled.splice(0, 2);
  const roundTable: GameState["roundTable"] = [
    shuffled.shift() ?? null,
    shuffled.shift() ?? null,
    shuffled.shift() ?? null,
  ];
  const players: GameState["players"] = [
    { id: "P1", lineage: [p1Ace], hand: p1Hand },
    { id: "P2", lineage: [p2Ace], hand: p2Hand },
  ];
  const events: GameEvent[] = [
    {
      type: "SETUP",
      seed,
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
      deckCount: shuffled.length,
    },
  ];
  const state: GameState = {
    seed,
    config,
    status: "running",
    completedTurns: 0,
    activePlayerIndex: 0,
    players,
    deck: shuffled,
    roundTable,
    pendingCardId: null,
    altar: { minors: [], major: null },
    veil: [],
    events,
  };
  noteBoard(state);
  return state;
}

function takeAce(pool: MinorCard[], element: Element): MinorCard {
  const index = pool.findIndex((card) => card.element === element && card.rank === 1);
  if (index < 0) throw new Error(`No ${element} Ace left in the deal pool`);
  return pool.splice(index, 1)[0]!;
}

function sendToAltar(state: GameState, turn: number, card: MinorCard): void {
  state.altar.minors.push(card);
  emit(state, { type: "TO_ALTAR", turn, card: snap(card), reason: "unused-encounter" });
  if (state.altar.minors.length > ALTAR_MINOR_CAPACITY) {
    const oldest = state.altar.minors.shift();
    if (!oldest) throw new Error("Altar overflow found no minor");
    state.veil.push(oldest);
    emit(state, { type: "TO_VEIL", turn, card: snap(oldest), reason: "altar-overflow" });
  }
}

function refill(state: GameState, turn: number): void {
  const filled: { index: number; card: MinorCard }[] = [];
  const emptySlots: number[] = [];
  for (let index = 0; index < state.roundTable.length; index += 1) {
    if (state.roundTable[index]) continue;
    const card = state.deck.shift();
    if (!card) {
      emptySlots.push(index);
      continue;
    }
    state.roundTable[index] = card;
    filled.push({ index, card });
  }
  if (filled.length) {
    emit(state, { type: "REFILL", turn, slots: filled.map((slot) => ({ index: slot.index, card: snap(slot.card) })) });
  }
  if (emptySlots.length) emit(state, { type: "DECK_EXHAUSTED", turn, emptySlots });
}

function evolve(state: GameState, turn: number, player: PlayerState, pick: { card: MinorCard; source: "encounter" | "hand" }): void {
  const from = topCard(player);
  if (pick.source === "encounter") {
    const slot = state.roundTable.findIndex((card) => card?.id === pick.card.id);
    if (slot < 0) throw new Error("Evolution encounter is not on the table");
    state.roundTable[slot] = null;
  } else {
    const index = player.hand.findIndex((card) => card.id === pick.card.id);
    if (index < 0) throw new Error("Evolution card is not in hand");
    player.hand.splice(index, 1);
  }
  player.lineage.push(pick.card);
  emit(state, {
    type: "EVOLUTION",
    turn,
    playerId: player.id,
    source: pick.source,
    from: snap(from),
    to: snap(pick.card),
    rankJump: pick.card.rank - from.rank,
    alignmentMatch: alignmentMatch(from, pick.card),
  });
}

function leftmost(table: GameState["roundTable"]): MinorCard | null {
  return table.find((card) => card !== null) ?? null;
}

function emit(state: GameState, event: GameEvent): void {
  state.events.push(event);
  noteBoard(state);
}
