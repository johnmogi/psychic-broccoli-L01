import { formatAnyCard, formatCard, type MajorCard, type MinorCard } from "../cards.js";
import type { GameState } from "../state.js";
import type { L02State } from "../l02/state.js";
import { metricsFromEvents } from "../metrics.js";
import { l02MetricsFromEvents } from "../l02/metrics.js";
import type { BoardSnap } from "./capture.js";
import type { Highlight } from "./timeline.js";

/** Where a console line can be rendered later: admin log, stats, system, advice, or story. */
export type ConsoleChannel = "admin" | "stats" | "system" | "advice" | "story";

export interface CardFace {
  id: string;
  cardId: string;
  element: string;
  rankLabel: string;
  title: string;
  slot: number | null;
  highlighted: boolean;
  top: boolean;
  /** Admin label for a slot with no card. "hidden" is reserved for a future player view. */
  blank: "empty" | "hidden" | null;
  mark?: string;
}

export interface ZoneModel {
  id: string;
  title: string;
  hint?: string;
  cards: CardFace[];
  highlighted: boolean;
  quiet: boolean;
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
  selectable: boolean;
}

export interface MetricItem {
  id: string;
  label: string;
  value: string;
}

export interface Inspection {
  layer: "L01" | "L02" | "L03";
  seed: string;
  players: PlayerModel[];
  zones: ZoneModel[];
  metrics: MetricItem[];
  console: ConsoleEntry[];
}

type CardLike = (Pick<MinorCard, "id" | "rank" | "element"> | Pick<MajorCard, "id" | "element" | "court" | "back" | "name">) & { name?: string; arcana?: string; rank?: number | null };

export function cardFace(card: CardLike): CardFace {
  const major = card.arcana === "major" && "court" in card && card.court && "back" in card && card.back;
  return {
    id: card.id,
    cardId: card.id,
    element: card.element,
    rankLabel: major ? card.court[0]!.toUpperCase() : card.rank === 1 ? "A" : String(card.rank ?? ""),
    title: card.name ?? (major ? formatAnyCard({ ...card, arcana: "major" }) : formatCard({ rank: card.rank ?? 0, element: card.element as MinorCard["element"] })),
    slot: null,
    highlighted: false,
    top: false,
    blank: null,
    mark: major ? card.back : undefined,
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

export function inspectBoard(layer: "L01" | "L02" | "L03", board: BoardSnap, highlight: Highlight): { players: PlayerModel[]; zones: ZoneModel[] } {
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
    mark(pile("altar-major", "Altar major", board.altarMajor ? [board.altarMajor] : []), highlight, "altar-major"),
    mark(pile("veil", "Veil", board.veil, "ordered history, last card is top"), highlight, "veil"),
    mark(pile("deck", "Deck", board.deck), highlight, "deck"),
  ];
  if (layer === "L03") {
    zones.splice(1, 0, mark(pile("pd", "Parallel dimension", board.pd ? [board.pd] : [], "one major waits until next turn"), highlight, "pd"));
    if ((board.teamMilestones ?? 0) > 0) {
      zones.push({
        id: "milestone",
        title: "Joker / milestone",
        hint: `${board.teamMilestones} team milestone${board.teamMilestones === 1 ? "" : "s"}`,
        cards: [],
        highlighted: highlight.zones.includes("milestone"),
        quiet: false,
      });
    }
  }
  if (layer === "L01") {
    const pending = board.pendingCardId ? [faceById(cardsOn(board), board.pendingCardId)] : [];
    zones.push(mark({ id: "pending", title: "Pending encounter", cards: paint(pending, highlight, null), highlighted: false, quiet: false }, highlight, "pending"));
  }
  return { players, zones };
}

function boardOf(state: GameState | L02State): BoardSnap {
  const extra = state as { pd?: MajorCard | null; teamMilestones?: number };
  return {
    status: state.status,
    completedTurns: state.completedTurns,
    activePlayerIndex: state.activePlayerIndex,
    players: state.players,
    deck: state.deck,
    roundTable: [...state.roundTable],
    pendingCardId: "pendingCardId" in state ? state.pendingCardId : null,
    altarMinors: state.altar.minors,
    altarMajor: state.altar.major ?? null,
    veil: state.veil,
    pd: extra.pd ?? null,
    teamMilestones: extra.teamMilestones ?? 0,
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
    selectable: true,
  }));
}

function pile(id: string, title: string, cards: readonly CardLike[], hint?: string): ZoneModel {
  const faces = cards.map((card, index) => ({ ...cardFace(card), top: id === "lineage" && index === cards.length - 1 }));
  return { id, title, hint, cards: faces, highlighted: false, quiet: id === "lineage" };
}

function slots(id: string, title: string, cards: readonly (CardLike | null)[], highlight: Highlight): ZoneModel {
  return {
    id,
    title,
    highlighted: false,
    quiet: false,
    cards: cards.map((card, index) => {
      const face = card
        ? { ...cardFace(card), id: `${card.id}@${index}`, slot: index }
        : { id: `${id}-empty-${index}`, cardId: "", element: "", rankLabel: "", title: "empty", slot: index, highlighted: false, top: false, blank: "empty" as const };
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
    quiet: zone.quiet,
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
  return { id, cardId: id, element: "", rankLabel: "", title: id, slot: null, highlighted: false, top: false, blank: null };
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
    const snap = value as { rank?: number | null; element?: string; arcana?: string; name?: string };
    if (snap.arcana === "major" && snap.name) return snap.name;
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
    case "MAJOR_REVEALED":
      return `${card(event.card)} revealed`;
    case "TO_PD":
      return `${card(event.card)} moved to PD`;
    case "PD_SURFACE":
      return `${card(event.card)} surfaced to altar`;
    case "ALTAR_MAJOR":
      return `${card(event.card)} holds the altar`;
    case "MAJOR_TO_VEIL":
      return `${card(event.card)} to Veil (${String(event.reason)})`;
    case "MAJOR_REPLACED":
      return `${card(event.newer)} replaced ${card(event.older)}`;
    case "ECLIPSE":
      return `Eclipse: ${card(event.older)} met ${card(event.newer)}`;
    case "TRIANGULATION":
      return "Triangulation: three majors converged";
    case "JOKER_AWARDED":
      return `Joker awarded to ${String(event.playerId)}`;
    case "TEAM_MILESTONE":
      return `Team milestone for ${String(event.playerId)}`;
    case "MAJOR_FIELD":
      return `major field ${String(event.count)}`;
    default: {
      const { type, ...rest } = event;
      return `${type} ${JSON.stringify(rest)}`;
    }
  }
}
