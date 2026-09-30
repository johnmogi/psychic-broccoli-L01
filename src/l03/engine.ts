import { createL01Pool, createMajorCatalog, type MajorCard, type MinorCard } from "../cards.js";
import { alignmentMatch, isLegalEvolution } from "../rules.js";
import { shuffle } from "../rng.js";
import { noteBoard } from "../z01/capture.js";
import { resolveL03Config, type L03Config } from "./config.js";
import { snapMajor, snapMinor, type L03Event } from "./events.js";
import { activePlayer, isMajor, isMinor, topCard, type L03State, type TableCard } from "./state.js";
import type { PlayerState } from "../state.js";

export function playL03(seed: string, partial: Partial<L03Config> = {}): L03State {
  const config = resolveL03Config(partial);
  if (!Number.isInteger(config.turnCount) || config.turnCount < 1) throw new Error("turnCount must be an integer of at least 1");
  if (config.highLevelMajorChoice) throw new Error("highLevelMajorChoice is not implemented; newestStays remains the L03 default");
  if (config.eclipseMode !== "sameRankOppositeBack") throw new Error(`eclipseMode ${String(config.eclipseMode)} is not implemented`);
  if (config.triangulationMode !== "sameRankMajorSet" && config.triangulationMode !== "anyThreeMajors") {
    throw new Error(`triangulationMode ${String(config.triangulationMode)} is not implemented`);
  }
  let state = setup(seed, config);
  while (state.completedTurns < config.turnCount) state = resolveTurn(state);
  state.status = "completed";
  emit(state, { type: "COMPLETE", completedTurns: state.completedTurns, maxCombinedMajors: state.maxCombinedMajors, teamMilestones: state.teamMilestones });
  return state;
}

export function resolveTurn(state: L03State): L03State {
  const next = structuredClone(state) as L03State;
  const turn = next.completedTurns + 1;
  const player = activePlayer(next);
  emit(next, { type: "TURN_START", turn, playerId: player.id });
  surfacePd(next, turn, player.id);
  refill(next, turn);
  routeMajors(next, turn, player.id);
  collectLeftmostMinor(next, turn, player);
  const evolved = evolveFromHand(next, turn, player);
  if (!evolved && effectCount(next, turn) < next.config.maxElementalEffectsPerTurn) {
    const choice = chooseMinorVeilEffect(next);
    if (choice === "water") applyWaterResurface(next, player, turn);
    else if (choice === "air") applyAirSwap(next, player, turn);
  }
  sweepMinors(next, turn);
  for (const seated of next.players) emit(next, { type: "HAND_SNAPSHOT", turn, playerId: seated.id, size: seated.hand.length });
  next.completedTurns = turn;
  next.activePlayerIndex = next.activePlayerIndex === 0 ? 1 : 0;
  return next;
}

export function isDefaultEclipse(older: MajorCard, newer: MajorCard): boolean {
  return older.court === newer.court && older.back !== newer.back;
}

function setup(seed: string, config: L03Config): L03State {
  const pool = createL01Pool();
  const p1Ace = takeAce(pool, config.startingAces.P1);
  const p2Ace = takeAce(pool, config.startingAces.P2);
  const shuffled = shuffle(pool, seed);
  const p1Hand = takeMinors(shuffled, config.startingHand);
  const p2Hand = takeMinors(shuffled, config.startingHand);
  const roundTable: L03State["roundTable"] = [shuffled.shift() ?? null, shuffled.shift() ?? null, shuffled.shift() ?? null];
  const deck = buildDeck(seed, shuffled, config);
  const players: L03State["players"] = [
    { id: "P1", lineage: [p1Ace], hand: p1Hand },
    { id: "P2", lineage: [p2Ace], hand: p2Hand },
  ];
  const majorCount = deck.filter(isMajor).length;
  const events: L03Event[] = [{
    type: "SETUP",
    seed,
    turnCount: config.turnCount,
    alignmentRule: config.alignmentRule,
    maxJump: config.maxJump,
    majorDeckMode: config.majorDeckMode,
    players: players.map((player) => ({ id: player.id, lineage: player.lineage.map(snapMinor), hand: player.hand.map(snapMinor) })),
    roundTable: roundTable.flatMap((card) => (card ? [snapCard(card)] : [])),
    deckCount: deck.length,
    majorCount,
  }];
  const state: L03State = {
    seed,
    config,
    status: "running",
    completedTurns: 0,
    activePlayerIndex: 0,
    players,
    deck,
    roundTable,
    pd: null,
    altar: { minors: [], major: null },
    veil: [],
    teamMilestones: 0,
    maxCombinedMajors: 0,
    triangulationOpen: false,
    events,
  };
  noteBoard(state);
  return state;
}

function buildDeck(seed: string, minorsLeft: MinorCard[], config: L03Config): TableCard[] {
  if (!config.majorsEnabled) return minorsLeft;
  const catalog = createMajorCatalog();
  if (config.majorDeckMode === "scripted") {
    const prefix = config.scriptedMajorIds.map((id) => {
      const card = catalog.find((item) => item.id === id);
      if (!card) throw new Error(`Unknown scripted major ${id}`);
      return card;
    });
    const rest = catalog.filter((card) => !config.scriptedMajorIds.includes(card.id));
    return [...prefix, ...minorsLeft, ...rest];
  }
  return shuffle([...minorsLeft, ...catalog], `${seed}:l03`);
}

function surfacePd(state: L03State, turn: number, playerId: string): void {
  if (!state.pd) return;
  const card = state.pd;
  state.pd = null;
  emit(state, { type: "PD_SURFACE", turn, card: snapMajor(card) });
  noteField(state, turn);
  enterAltar(state, turn, card, playerId);
}

function refill(state: L03State, turn: number): void {
  const filled: { index: number; card: TableCard }[] = [];
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
    if (isMajor(card)) emit(state, { type: "MAJOR_REVEALED", turn, card: snapMajor(card), slot: index });
  }
  if (filled.length) emit(state, { type: "REFILL", turn, slots: filled.map((slot) => ({ index: slot.index, card: snapCard(slot.card) })) });
  if (emptySlots.length) emit(state, { type: "DECK_EXHAUSTED", turn, emptySlots });
}

function routeMajors(state: L03State, turn: number, playerId: string): void {
  if (!state.config.majorsEnabled) return;
  let guard = state.deck.length + state.roundTable.length + 4;
  while (guard > 0) {
    guard -= 1;
    const visible = visibleMajors(state);
    const field = combinedField(state, visible);
    noteField(state, turn);
    maybeTriangulate(state, turn, playerId, field);
    if (!visible.length) return;
    if (visible.length === 1 && state.config.pdEnabled && !state.pd) {
      const only = visible[0]!;
      state.roundTable[only.index] = null;
      state.pd = only.card;
      emit(state, { type: "TO_PD", turn, card: snapMajor(only.card) });
      refill(state, turn);
      continue;
    }
    for (const slot of visible) state.roundTable[slot.index] = null;
    for (const slot of visible) enterAltar(state, turn, slot.card, playerId);
    refill(state, turn);
  }
  throw new Error("Major routing did not settle");
}

function maybeTriangulate(state: L03State, turn: number, playerId: string, field: MajorCard[]): void {
  if (!triangulationReady(state, field)) {
    state.triangulationOpen = false;
    return;
  }
  if (state.triangulationOpen) return;
  state.triangulationOpen = true;
  state.teamMilestones += 1;
  emit(state, { type: "TRIANGULATION", turn, count: field.length, playerId });
  emit(state, { type: "TEAM_MILESTONE", turn, playerId, reason: "triangulation" });
}

function triangulationReady(state: L03State, field: MajorCard[]): boolean {
  if (!state.config.triangulationEnabled) return false;
  if (state.config.triangulationMode === "anyThreeMajors") return field.length >= 3;
  const counts = new Map<string, number>();
  for (const card of field) counts.set(card.court, (counts.get(card.court) ?? 0) + 1);
  return [...counts.values()].some((count) => count >= 3);
}

function combinedField(state: L03State, visible: { card: MajorCard }[]): MajorCard[] {
  const field = visible.map((slot) => slot.card);
  if (state.pd) field.push(state.pd);
  if (state.altar.major) field.push(state.altar.major);
  return field;
}

function enterAltar(state: L03State, turn: number, incoming: MajorCard, playerId: string): void {
  const current = state.altar.major;
  if (current && state.config.eclipseEnabled && eclipsePair(state, current, incoming)) {
    state.altar.major = incoming;
    state.veil.push(current);
    state.teamMilestones += 1;
    emit(state, { type: "ECLIPSE", turn, playerId, older: snapMajor(current), newer: snapMajor(incoming) });
    emit(state, { type: "MAJOR_TO_VEIL", turn, card: snapMajor(current), reason: "eclipse" });
    emit(state, { type: "JOKER_AWARDED", turn, playerId, reason: "eclipse" });
    emit(state, { type: "ALTAR_MAJOR", turn, card: snapMajor(incoming) });
    noteField(state, turn);
    return;
  }
  if (current) {
    if (state.config.majorOverflowMode === "activeChoice") {
      throw new Error("majorOverflowMode activeChoice is not implemented; newestStays remains the L03 default");
    }
    state.veil.push(current);
    emit(state, { type: "MAJOR_TO_VEIL", turn, card: snapMajor(current), reason: "replaced" });
    emit(state, { type: "MAJOR_REPLACED", turn, older: snapMajor(current), newer: snapMajor(incoming) });
  }
  if (state.altar.major && state.config.altarMajorCapacity < 1) throw new Error("altarMajorCapacity cannot hold the incoming major");
  state.altar.major = incoming;
  emit(state, { type: "ALTAR_MAJOR", turn, card: snapMajor(incoming) });
  noteField(state, turn);
}

function eclipsePair(state: L03State, older: MajorCard, newer: MajorCard): boolean {
  if (state.config.eclipseMode !== "sameRankOppositeBack") {
    throw new Error(`eclipseMode ${state.config.eclipseMode} is not implemented`);
  }
  return isDefaultEclipse(older, newer);
}

function noteField(state: L03State, turn: number): void {
  const visible = visibleMajors(state).length;
  const count = visible + (state.pd ? 1 : 0) + (state.altar.major ? 1 : 0);
  if (count <= state.maxCombinedMajors) return;
  state.maxCombinedMajors = count;
  emit(state, { type: "MAJOR_FIELD", turn, count });
}

function visibleMajors(state: L03State): { index: number; card: MajorCard }[] {
  const found: { index: number; card: MajorCard }[] = [];
  state.roundTable.forEach((card, index) => {
    if (isMajor(card)) found.push({ index, card });
  });
  return found;
}

function collectLeftmostMinor(state: L03State, turn: number, player: PlayerState): void {
  const slot = state.roundTable.findIndex(isMinor);
  if (slot < 0) return;
  const card = state.roundTable[slot];
  if (!isMinor(card)) return;
  if (state.config.handLimit !== "unlimited" && player.hand.length >= state.config.handLimit) return;
  state.roundTable[slot] = null;
  player.hand.push(card);
  emit(state, { type: "COLLECT", turn, playerId: player.id, card: snapMinor(card) });
}

function evolveFromHand(state: L03State, turn: number, player: PlayerState): boolean {
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
      from: snapMinor(top),
      to: snapMinor(card),
      rankJump: card.rank - top.rank,
      alignmentMatch: alignmentMatch(top, card),
    });
  }
}

function chooseMinorVeilEffect(state: L03State): "water" | "air" | null {
  const top = state.veil[state.veil.length - 1];
  if (!isMinor(top)) return null;
  const player = activePlayer(state);
  if (state.config.waterResurfaceEnabled && player.hand.some((card) => card.element === "water")) return "water";
  const slot = state.roundTable.findIndex(isMinor);
  if (state.config.airSwapEnabled && slot >= 0 && player.hand.some((card) => card.element === "air")) return "air";
  return null;
}

function applyWaterResurface(state: L03State, player: PlayerState, turn: number): void {
  const recovered = state.veil[state.veil.length - 1];
  if (!isMinor(recovered)) return;
  const handIndex = player.hand.findIndex((card) => card.element === "water");
  if (handIndex < 0) return;
  state.veil.pop();
  const spent = player.hand.splice(handIndex, 1)[0];
  if (!spent) return;
  state.veil.push(spent);
  emit(state, { type: "WATER_SPEND", turn, playerId: player.id, card: snapMinor(spent) });
  emit(state, { type: "TO_VEIL", turn, card: snapMinor(spent), reason: "spend" });
  emit(state, { type: "RESURFACE", turn, card: snapMinor(recovered) });
  pushAltar(state, turn, recovered, "resurface");
}

function applyAirSwap(state: L03State, player: PlayerState, turn: number): void {
  const fromVeil = state.veil[state.veil.length - 1];
  const slot = state.roundTable.findIndex(isMinor);
  const fromTable = slot >= 0 ? state.roundTable[slot] : null;
  if (!isMinor(fromVeil) || !isMinor(fromTable)) return;
  const handIndex = player.hand.findIndex((card) => card.element === "air");
  if (handIndex < 0) return;
  state.veil.pop();
  state.roundTable[slot] = fromVeil;
  state.veil.push(fromTable);
  const spent = player.hand.splice(handIndex, 1)[0];
  if (!spent) return;
  state.veil.push(spent);
  emit(state, { type: "AIR_SPEND", turn, playerId: player.id, card: snapMinor(spent) });
  emit(state, { type: "TO_VEIL", turn, card: snapMinor(fromTable), reason: "swap-out" });
  emit(state, { type: "TO_VEIL", turn, card: snapMinor(spent), reason: "spend" });
  emit(state, { type: "SWAP", turn, slot, fromVeil: snapMinor(fromVeil), fromTable: snapMinor(fromTable) });
}

function sweepMinors(state: L03State, turn: number): void {
  for (let index = 0; index < state.roundTable.length; index += 1) {
    const card = state.roundTable[index];
    if (!isMinor(card)) continue;
    state.roundTable[index] = null;
    pushAltar(state, turn, card, "uncollected");
  }
}

function pushAltar(state: L03State, turn: number, card: MinorCard, reason: "uncollected" | "resurface"): void {
  while (state.altar.minors.length >= state.config.altarMinorCapacity) {
    if (state.config.altarOverflowMode === "activeChoice") {
      throw new Error("altarOverflowMode activeChoice is not implemented; oldest remains the L03 default");
    }
    const oldest = state.altar.minors.shift();
    if (!oldest) throw new Error("Altar overflow found no minor");
    state.veil.push(oldest);
    emit(state, { type: "TO_VEIL", turn, card: snapMinor(oldest), reason: "altar-overflow" });
  }
  state.altar.minors.push(card);
  emit(state, { type: "TO_ALTAR", turn, card: snapMinor(card), reason });
}

function effectCount(state: L03State, turn: number): number {
  return state.events.filter((event) => event.type === "WATER_SPEND" || event.type === "AIR_SPEND").filter((event) => "turn" in event && event.turn === turn).length;
}

function takeAce(pool: MinorCard[], element: MinorCard["element"]): MinorCard {
  const index = pool.findIndex((card) => card.element === element && card.rank === 1);
  const ace = pool[index];
  if (!ace) throw new Error(`Missing ${element} ace`);
  pool.splice(index, 1);
  return ace;
}

function takeMinors(deck: MinorCard[], count: number): MinorCard[] {
  const cards: MinorCard[] = [];
  for (let index = 0; index < count; index += 1) {
    const card = deck.shift();
    if (card) cards.push(card);
  }
  return cards;
}

function snapCard(card: TableCard) {
  return isMajor(card) ? snapMajor(card) : snapMinor(card);
}

function emit(state: L03State, event: L03Event): void {
  state.events.push(event);
  noteBoard(state);
}
