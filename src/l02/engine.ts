import { createL01Pool, type Element, type MinorCard } from "../cards.js";
import { alignmentMatch, isLegalEvolution } from "../rules.js";
import { shuffle } from "../rng.js";
import { topCard, type PlayerState } from "../state.js";
import { chooseVeilEffect } from "./bot.js";
import { resolveL02Config, type L02Config } from "./config.js";
import { snap, type L02Event } from "./events.js";
import { activePlayer, type L02State } from "./state.js";
import { noteBoard } from "../z01/capture.js";

export function playL02(seed: string, partial: Partial<L02Config> = {}): L02State {
  const config = resolveL02Config(partial);
  if (!Number.isInteger(config.turnCount) || config.turnCount < 1) throw new Error("turnCount must be an integer of at least 1");
  let state = setup(seed, config);
  while (state.completedTurns < config.turnCount) state = resolveTurn(state);
  state.status = "completed";
  emit(state, { type: "COMPLETE", completedTurns: state.completedTurns });
  return state;
}

export function resolveTurn(state: L02State): L02State {
  const next = structuredClone(state) as L02State;
  const turn = next.completedTurns + 1;
  const player = activePlayer(next);
  emit(next, { type: "TURN_START", turn, playerId: player.id });
  refill(next, turn);
  collectLeftmost(next, turn, player);
  const evolved = evolveFromHand(next, turn, player);
  if (!evolved && effectCount(next, turn) < next.config.maxElementalEffectsPerTurn) {
    const choice = chooseVeilEffect(next);
    if (choice === "water") applyWaterResurface(next, player, turn);
    else if (choice === "air") applyAirSwap(next, player, turn);
  }
  sweepTable(next, turn);
  for (const seated of next.players) {
    emit(next, { type: "HAND_SNAPSHOT", turn, playerId: seated.id, size: seated.hand.length });
  }
  next.completedTurns = turn;
  next.activePlayerIndex = next.activePlayerIndex === 0 ? 1 : 0;
  return next;
}

export function applyWaterResurface(state: L02State, player: PlayerState, turn = state.completedTurns + 1): void {
  assertEffectAllowed(state, turn);
  if (!state.config.waterResurfaceEnabled) throw new Error("Water resurface is disabled");
  if (state.veil.length === 0) throw new Error("Veil is empty");
  const handIndex = player.hand.findIndex((card) => card.element === "water");
  if (handIndex < 0) throw new Error("No Water card in hand");
  const recovered = state.veil.pop();
  if (!recovered) throw new Error("Veil is empty");
  const spent = player.hand.splice(handIndex, 1)[0];
  if (!spent) throw new Error("Water card disappeared");
  state.veil.push(spent);
  emit(state, { type: "WATER_SPEND", turn, playerId: player.id, card: snap(spent) });
  emit(state, { type: "TO_VEIL", turn, card: snap(spent), reason: "spend" });
  emit(state, { type: "RESURFACE", turn, card: snap(recovered) });
  pushAltar(state, turn, recovered, "resurface");
}

export function applyAirSwap(state: L02State, player: PlayerState, turn = state.completedTurns + 1, slot = leftmostIndex(state.roundTable)): void {
  assertEffectAllowed(state, turn);
  if (!state.config.airSwapEnabled) throw new Error("Air swap is disabled");
  if (state.veil.length === 0) throw new Error("Veil is empty");
  if (slot < 0 || !state.roundTable[slot]) throw new Error("No Round Table card to swap");
  const handIndex = player.hand.findIndex((card) => card.element === "air");
  if (handIndex < 0) throw new Error("No Air card in hand");
  const fromVeil = state.veil.pop();
  const fromTable = state.roundTable[slot];
  if (!fromVeil || !fromTable) throw new Error("Swap is missing a card");
  state.roundTable[slot] = fromVeil;
  state.veil.push(fromTable);
  const spent = player.hand.splice(handIndex, 1)[0];
  if (!spent) throw new Error("Air card disappeared");
  state.veil.push(spent);
  emit(state, { type: "AIR_SPEND", turn, playerId: player.id, card: snap(spent) });
  emit(state, { type: "TO_VEIL", turn, card: snap(fromTable), reason: "swap-out" });
  emit(state, { type: "TO_VEIL", turn, card: snap(spent), reason: "spend" });
  emit(state, { type: "SWAP", turn, slot, fromVeil: snap(fromVeil), fromTable: snap(fromTable) });
}

function setup(seed: string, config: L02Config): L02State {
  const pool = createL01Pool();
  const p1Ace = takeAce(pool, config.startingAces.P1);
  const p2Ace = takeAce(pool, config.startingAces.P2);
  const shuffled = shuffle(pool, seed);
  const p1Hand = shuffled.splice(0, config.startingHand);
  const p2Hand = shuffled.splice(0, config.startingHand);
  const roundTable: L02State["roundTable"] = [shuffled.shift() ?? null, shuffled.shift() ?? null, shuffled.shift() ?? null];
  const players: L02State["players"] = [
    { id: "P1", lineage: [p1Ace], hand: p1Hand },
    { id: "P2", lineage: [p2Ace], hand: p2Hand },
  ];
  const events: L02Event[] = [
    {
      type: "SETUP",
      seed,
      turnCount: config.turnCount,
      alignmentRule: config.alignmentRule,
      maxJump: config.maxJump,
      players: players.map((player) => ({
        id: player.id,
        lineage: player.lineage.map(snap),
        hand: player.hand.map(snap),
      })),
      roundTable: roundTable.filter((card): card is MinorCard => card !== null).map(snap),
      deckCount: shuffled.length,
    },
  ];
  const state: L02State = {
    seed,
    config,
    status: "running",
    completedTurns: 0,
    activePlayerIndex: 0,
    players,
    deck: shuffled,
    roundTable,
    altar: { minors: [], major: null },
    veil: [],
    events,
  };
  noteBoard(state);
  return state;
}

function refill(state: L02State, turn: number): void {
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
  if (filled.length) emit(state, { type: "REFILL", turn, slots: filled.map((slot) => ({ index: slot.index, card: snap(slot.card) })) });
  if (emptySlots.length) emit(state, { type: "DECK_EXHAUSTED", turn, emptySlots });
}

function collectLeftmost(state: L02State, turn: number, player: PlayerState): void {
  const slot = leftmostIndex(state.roundTable);
  if (slot < 0) return;
  const card = state.roundTable[slot];
  if (!card) return;
  if (state.config.handLimit !== "unlimited" && player.hand.length >= state.config.handLimit) return;
  state.roundTable[slot] = null;
  player.hand.push(card);
  emit(state, { type: "COLLECT", turn, playerId: player.id, card: snap(card) });
}

function evolveFromHand(state: L02State, turn: number, player: PlayerState): boolean {
  let evolved = false;
  while (true) {
    const top = topCard(player);
    const index = player.hand.findIndex((card) => isLegalEvolution(top, card, state.config));
    if (index < 0) return evolved;
    const card = player.hand.splice(index, 1)[0];
    if (!card) return evolved;
    player.lineage.push(card);
    evolved = true;
    emit(state, {
      type: "EVOLUTION",
      turn,
      playerId: player.id,
      source: "hand",
      from: snap(top),
      to: snap(card),
      rankJump: card.rank - top.rank,
      alignmentMatch: alignmentMatch(top, card),
    });
  }
}

function sweepTable(state: L02State, turn: number): void {
  for (let index = 0; index < state.roundTable.length; index += 1) {
    const card = state.roundTable[index];
    if (!card) continue;
    state.roundTable[index] = null;
    pushAltar(state, turn, card, "uncollected");
  }
}

function pushAltar(state: L02State, turn: number, card: MinorCard, reason: "uncollected" | "resurface"): void {
  while (state.altar.minors.length >= state.config.altarCapacity) {
    const overflow = takeOverflow(state);
    state.veil.push(overflow);
    emit(state, { type: "TO_VEIL", turn, card: snap(overflow), reason: "altar-overflow" });
  }
  state.altar.minors.push(card);
  emit(state, { type: "TO_ALTAR", turn, card: snap(card), reason });
}

function takeOverflow(state: L02State): MinorCard {
  if (state.config.altarOverflowMode === "activeChoice") {
    throw new Error("altarOverflowMode activeChoice is not implemented; oldest remains the L02 default");
  }
  const oldest = state.altar.minors.shift();
  if (!oldest) throw new Error("Altar overflow found no minor");
  return oldest;
}

function assertEffectAllowed(state: L02State, turn: number): void {
  if (effectCount(state, turn) >= state.config.maxElementalEffectsPerTurn) {
    throw new Error("elemental effect limit");
  }
}

function effectCount(state: L02State, turn: number): number {
  return state.events.filter(
    (event) => (event.type === "WATER_SPEND" || event.type === "AIR_SPEND") && event.turn === turn,
  ).length;
}

function emit(state: L02State, event: L02Event): void {
  state.events.push(event);
  noteBoard(state);
}

function leftmostIndex(table: L02State["roundTable"]): number {
  return table.findIndex((card) => card !== null);
}

function takeAce(pool: MinorCard[], element: Element): MinorCard {
  const index = pool.findIndex((card) => card.element === element && card.rank === 1);
  if (index < 0) throw new Error(`No ${element} Ace left in the deal pool`);
  return pool.splice(index, 1)[0]!;
}
