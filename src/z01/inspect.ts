import { formatCard, type MinorCard } from "../cards.js";
import type { GameState } from "../state.js";
import type { L02State } from "../l02/state.js";
import { metricsFromEvents } from "../metrics.js";
import { l02MetricsFromEvents } from "../l02/metrics.js";

/** Where a console line can be rendered later. The first shell only emits "admin". */
export type ConsoleChannel = "admin" | "advice" | "story";

export interface CardFace {
  id: string;
  element: string;
  rankLabel: string;
  title: string;
}

export interface ZoneModel {
  id: string;
  title: string;
  hint?: string;
  cards: CardFace[];
}

export interface PlayerModel {
  id: string;
  active: boolean;
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
    element: card.element,
    rankLabel: card.rank === 1 ? "A" : String(card.rank),
    title: card.name ?? formatCard(card),
  };
}

export function inspectL01(state: GameState): Inspection {
  const cards = allCards(state);
  return {
    layer: "L01",
    seed: state.seed,
    players: state.players.map((player, index) => ({
      id: player.id,
      active: index === state.activePlayerIndex,
      zones: [
        pile("lineage", "Lineage", player.lineage, "top card is the current lineage"),
        pile("hand", "Hand", player.hand),
      ],
    })),
    zones: [
      slots("round-table", "Round table", state.roundTable),
      pile("altar-minors", "Altar minors", state.altar.minors, "oldest first"),
      pile("altar-major", "Altar major", []),
      pile("veil", "Veil", state.veil, "ordered history, last card is top"),
      pile("deck", "Deck", state.deck),
      {
        id: "pending",
        title: "Pending encounter",
        cards: state.pendingCardId ? [faceById(cards, state.pendingCardId)] : [],
      },
    ],
    metrics: metricItems(metricsFromEvents(state.events)),
    console: consoleFrom(state.events),
  };
}

export function inspectL02(state: L02State): Inspection {
  return {
    layer: "L02",
    seed: state.seed,
    players: state.players.map((player, index) => ({
      id: player.id,
      active: index === state.activePlayerIndex,
      zones: [
        pile("lineage", "Lineage", player.lineage, "top card is the current lineage"),
        pile("hand", "Hand", player.hand),
      ],
    })),
    zones: [
      slots("round-table", "Round table", state.roundTable),
      pile("altar-minors", "Altar minors", state.altar.minors, "oldest first"),
      pile("altar-major", "Altar major", []),
      pile("veil", "Veil", state.veil, "ordered history, last card is top"),
      pile("deck", "Deck", state.deck),
    ],
    metrics: metricItems(l02MetricsFromEvents(state.events)),
    console: consoleFrom(state.events),
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
  return { id, title, hint, cards: cards.map(cardFace) };
}

function slots(id: string, title: string, cards: readonly (CardLike | null)[]): ZoneModel {
  return {
    id,
    title,
    cards: cards.map((card, index) =>
      card
        ? { ...cardFace(card), id: `${card.id}@${index}` }
        : { id: `${id}-empty-${index}`, element: "unknown", rankLabel: "·", title: "empty slot" },
    ),
  };
}

function allCards(state: GameState): CardLike[] {
  return [
    ...state.deck,
    ...state.veil,
    ...state.altar.minors,
    ...state.roundTable.flatMap((card) => (card ? [card] : [])),
    ...state.players.flatMap((player) => [...player.lineage, ...player.hand]),
  ];
}

function faceById(cards: readonly CardLike[], id: string): CardFace {
  const card = cards.find((item) => item.id === id);
  if (card) return cardFace(card);
  return { id, element: "unknown", rankLabel: "·", title: id };
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
