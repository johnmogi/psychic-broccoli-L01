import { formatCard, type MinorCard } from "../cards.js";
import type { GameState } from "../state.js";
import type { L02State } from "../l02/state.js";
import { metricsFromEvents } from "../metrics.js";
import { l02MetricsFromEvents } from "../l02/metrics.js";
import type { BoardSnap } from "./capture.js";
import type { Highlight } from "./timeline.js";

/** Where a console line can be rendered later. The first shell only emits "admin". */
export type ConsoleChannel = "admin" | "advice" | "story";

export interface CardFace {
  id: string;
  cardId: string;
  element: string;
  rankLabel: string;
  title: string;
  slot: number | null;
  highlighted: boolean;
  top: boolean;
}

export interface ZoneModel {
  id: string;
  title: string;
  hint?: string;
  cards: CardFace[];
  highlighted: boolean;
}

export interface PlayerModel {
  id: string;
  active: boolean;
  highlighted: boolean;
  currentLineage: string;
  lineagePath: string;
  zones: ZoneModel[];
}

export interface ConsoleEntry {
  index: number;
  role: "log";
  channel: ConsoleChannel;
  eventType: string;
  text: string;
  event: unknown;
}

export interface MetricItem {
  id: string;
  label: string;
  value: string;
}

export interface Inspection {
  layer: "L01" | "L02";
  seed: string;
  players: PlayerModel[];
  zones: ZoneModel[];
  metrics: MetricItem[];
  console: ConsoleEntry[];
}

type CardLike = Pick<MinorCard, "id" | "rank" | "element"> & { name?: string };

export function cardFace(card: CardLike): CardFace {
  return {
    id: card.id,
    cardId: card.id,
    element: card.element,
    rankLabel: card.rank === 1 ? "A" : String(card.rank),
    title: card.name ?? formatCard(card),
    slot: null,
    highlighted: false,
    top: false,
  };
}

const quiet: Highlight = { cardIds: [], zones: [], slots: [] };

export function inspectL01(state: GameState): Inspection {
  return {
    layer: "L01",
    seed: state.seed,
    ...inspectBoard("L01", boardOf(state), quiet),
    metrics: metricItems(metricsFromEvents(state.events)),
    console: consoleFrom(state.events),
  };
}

export function inspectL02(state: L02State): Inspection {
  return {
    layer: "L02",
    seed: state.seed,
    ...inspectBoard("L02", boardOf(state), quiet),
    metrics: metricItems(l02MetricsFromEvents(state.events)),
    console: consoleFrom(state.events),
  };
}

export function inspectBoard(layer: "L01" | "L02", board: BoardSnap, highlight: Highlight): { players: PlayerModel[]; zones: ZoneModel[] } {
  const players = board.players.map((player, index) => ({
    id: player.id,
    active: index === board.activePlayerIndex,
    highlighted: highlight.zones.includes(`player:${player.id}`),
    currentLineage: formatCard(player.lineage[player.lineage.length - 1] ?? { rank: 0, element: "earth" }),
    lineagePath: player.lineage.map((card) => formatCard(card)).join(" → "),
    zones: [
      mark(pile("lineage", "Lineage", player.lineage, "top card is the current lineage"), highlight, `player:${player.id}:lineage`),
      mark(pile("hand", "Hand", player.hand), highlight, `player:${player.id}:hand`),
    ],
  }));
  const zones = [
    mark(slots("round-table", "Round table", board.roundTable, highlight), highlight, "round-table"),
    mark(pile("altar-minors", "Altar minors", board.altarMinors, "oldest first"), highlight, "altar-minors"),
    mark(pile("altar-major", "Altar major", []), highlight, "altar-major"),
    mark(pile("veil", "Veil", board.veil, "ordered history, last card is top"), highlight, "veil"),
    mark(pile("deck", "Deck", board.deck), highlight, "deck"),
  ];
  if (layer === "L01") {
    const pending = board.pendingCardId ? [faceById(cardsOn(board), board.pendingCardId)] : [];
    zones.push(mark({ id: "pending", title: "Pending encounter", cards: paint(pending, highlight, null), highlighted: false }, highlight, "pending"));
  }
  return { players, zones };
}

function boardOf(state: GameState | L02State): BoardSnap {
  return {
    status: state.status,
    completedTurns: state.completedTurns,
    activePlayerIndex: state.activePlayerIndex,
    players: state.players,
    deck: state.deck,
    roundTable: [...state.roundTable],
    pendingCardId: "pendingCardId" in state ? state.pendingCardId : null,
    altarMinors: state.altar.minors,
    veil: state.veil,
  };
}

export function metricItems(metrics: object): MetricItem[] {
  const items: MetricItem[] = [];
  flatten(metrics as Record<string, unknown>, "", items);
  return items;
}

export function consoleFrom(events: readonly { type: string }[]): ConsoleEntry[] {
  return events.map((event, index) => ({
    index,
    role: "log",
    channel: "admin",
    eventType: event.type,
    text: summarize(event as { type: string } & Record<string, unknown>),
    event,
  }));
}

function pile(id: string, title: string, cards: readonly CardLike[], hint?: string): ZoneModel {
  const faces = cards.map((card, index) => ({ ...cardFace(card), top: id === "lineage" && index === cards.length - 1 }));
  return { id, title, hint, cards: faces, highlighted: false };
}

function slots(id: string, title: string, cards: readonly (CardLike | null)[], highlight: Highlight): ZoneModel {
  return {
    id,
    title,
    highlighted: false,
    cards: cards.map((card, index) => {
      const face = card
        ? { ...cardFace(card), id: `${card.id}@${index}`, slot: index }
        : { id: `${id}-empty-${index}`, cardId: "", element: "unknown", rankLabel: "·", title: "empty slot", slot: index, highlighted: false, top: false };
      face.highlighted = face.highlighted || highlight.slots.includes(index) || (face.cardId !== "" && highlight.cardIds.includes(face.cardId));
      return face;
    }),
  };
}

function mark(zone: ZoneModel, highlight: Highlight, zoneId: string): ZoneModel {
  const zoneHit = highlight.zones.includes(zoneId);
  return {
    ...zone,
    highlighted: zoneHit,
    cards: paint(zone.cards, highlight, zone.id === "round-table" ? null : zone.id),
  };
}

function paint(cards: CardFace[], highlight: Highlight, zoneId: string | null): CardFace[] {
  return cards.map((card) => ({
    ...card,
    highlighted: card.highlighted || (card.cardId !== "" && highlight.cardIds.includes(card.cardId)) || (zoneId !== "round-table" && false),
  }));
}

function cardsOn(board: BoardSnap): CardLike[] {
  return [
    ...board.deck,
    ...board.veil,
    ...board.altarMinors,
    ...board.roundTable.flatMap((card) => (card ? [card] : [])),
    ...board.players.flatMap((player) => [...player.lineage, ...player.hand]),
  ];
}

function faceById(cards: readonly CardLike[], id: string): CardFace {
  const card = cards.find((item) => item.id === id);
  if (card) return cardFace(card);
  return { id, cardId: id, element: "unknown", rankLabel: "·", title: id, slot: null, highlighted: false, top: false };
}

function flatten(value: Record<string, unknown>, prefix: string, items: MetricItem[]): void {
  for (const [key, child] of Object.entries(value)) {
    const id = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object") flatten(child as Record<string, unknown>, id, items);
    else items.push({ id, label: id, value: String(child) });
  }
}

function summarize(event: { type: string } & Record<string, unknown>): string {
  const card = (value: unknown) => {
    if (!value || typeof value !== "object") return "";
    const snap = value as { rank?: number; element?: string };
    if (typeof snap.rank !== "number" || typeof snap.element !== "string") return "";
    return formatCard({ rank: snap.rank, element: snap.element as MinorCard["element"] });
  };
  switch (event.type) {
    case "SETUP":
      return `seed ${String(event.seed)} · deck ${String(event.deckCount)}`;
    case "TURN_START":
      return `turn ${String(event.turn)} · ${String(event.playerId)}`;
    case "REFILL":
      return `refill ${(event.slots as { index: number; card: unknown }[]).map((slot) => `${slot.index}:${card(slot.card)}`).join(" ")}`;
    case "DECK_EXHAUSTED":
      return `deck exhausted ${(event.emptySlots as number[]).join(",")}`;
    case "COLLECT":
      return `collect ${card(event.card)}`;
    case "EVOLUTION":
      return `evolve ${String(event.source)} ${card(event.from)} -> ${card(event.to)}`;
    case "TO_ALTAR":
      return `altar ${card(event.card)} (${String(event.reason)})`;
    case "TO_VEIL":
      return `veil ${card(event.card)} (${String(event.reason)})`;
    case "WATER_SPEND":
      return `water spend ${card(event.card)}`;
    case "AIR_SPEND":
      return `air spend ${card(event.card)}`;
    case "RESURFACE":
      return `resurface ${card(event.card)}`;
    case "SWAP":
      return `swap slot ${String(event.slot)} ${card(event.fromTable)} <-> ${card(event.fromVeil)}`;
    case "PENDING_ENCOUNTER":
      return `pending ${card(event.card)}`;
    case "HAND_SNAPSHOT":
      return `${String(event.playerId)} hand ${String(event.size)}`;
    case "COMPLETE":
      return `complete ${String(event.completedTurns)}`;
    default: {
      const { type, ...rest } = event;
      return `${type} ${JSON.stringify(rest)}`;
    }
  }
}
