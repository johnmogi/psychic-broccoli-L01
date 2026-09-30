import type { Element } from "../cards.js";
import { formatCard } from "../cards.js";
import type { BoardSnap } from "./capture.js";
import { consoleFrom } from "./inspect.js";

export interface Highlight {
  cardIds: string[];
  zones: string[];
  slots: number[];
}

export interface TimelineFrame {
  index: number;
  eventType: string;
  summary: string;
  explanation: string;
  turn: number | null;
  playerId: string | null;
  highlight: Highlight;
  board: BoardSnap;
}

export interface Timeline {
  layer: "L01" | "L02";
  seed: string;
  turnCount: number;
  frames: TimelineFrame[];
}

type LooseEvent = { type: string; [key: string]: unknown };

export function buildTimeline(
  layer: "L01" | "L02",
  seed: string,
  events: readonly { type: string }[],
  frames: readonly BoardSnap[],
): Timeline {
  if (frames.length !== events.length) {
    throw new Error(`Timeline has ${frames.length} snapshots for ${events.length} events`);
  }
  const lines = consoleFrom(events);
  const setup = events.find((event) => event.type === "SETUP") as { turnCount?: unknown } | undefined;
  return {
    layer,
    seed,
    turnCount: typeof setup?.turnCount === "number" ? setup.turnCount : 0,
    frames: events.map((event, index) => {
      const loose = event as LooseEvent;
      return {
      index,
      eventType: event.type,
      summary: lines[index]?.text ?? event.type,
      explanation: explainEvent(loose),
      turn: typeof loose["turn"] === "number" ? loose["turn"] : null,
      playerId: typeof loose["playerId"] === "string" ? loose["playerId"] : null,
      highlight: highlightFor(loose),
      board: frames[index]!,
    };
    }),
  };
}

export function timelinePositionLabel(
  frame: Pick<TimelineFrame, "index" | "turn" | "eventType" | "playerId">,
  eventTotal: number,
  turnCount: number,
): string {
  const shownTurn = frame.turn ?? (frame.eventType === "COMPLETE" ? turnCount : null);
  const turnText = shownTurn === null || turnCount <= 0 ? "—" : String(shownTurn);
  const planned = turnCount > 0 ? String(turnCount) : "—";
  const player = frame.playerId ?? "—";
  return `Turn ${turnText} / ${planned} · Event ${frame.index + 1} / ${eventTotal} · ${frame.eventType} · ${player}`;
}

export function moveTimeline(index: number, total: number, action: "start" | "back" | "next" | "end"): number {
  if (total <= 0) return 0;
  const last = total - 1;
  if (action === "start") return 0;
  if (action === "end") return last;
  if (action === "back") return Math.max(0, index - 1);
  return Math.min(last, index + 1);
}

export function explainEvent(event: LooseEvent): string {
  const card = (value: unknown) => label(value);
  switch (event.type) {
    case "SETUP":
      return `Setup dealt seed ${String(event["seed"])}.`;
    case "TURN_START":
      return `Turn ${String(event["turn"])} begins for ${String(event["playerId"])}.`;
    case "EVOLUTION":
      return `${String(event["playerId"])} evolved from ${card(event["from"])} to ${card(event["to"])} using a ${String(event["source"])} card.`;
    case "COLLECT":
      return `${String(event["playerId"])} collected ${card(event["card"])} into hand.`;
    case "TO_ALTAR":
      return altarLine(String(event["reason"]), card(event["card"]));
    case "TO_VEIL":
      return veilLine(String(event["reason"]), card(event["card"]));
    case "WATER_SPEND":
      return `${String(event["playerId"])} spent ${card(event["card"])} for Water resurface.`;
    case "RESURFACE":
      return `${card(event["card"])} left the top of the Veil toward the altar.`;
    case "AIR_SPEND":
      return `${String(event["playerId"])} spent ${card(event["card"])} for an Air swap.`;
    case "SWAP":
      return `Round Table slot ${String(event["slot"])} swapped ${card(event["fromTable"])} with Veil card ${card(event["fromVeil"])}.`;
    case "REFILL":
      return `Filled Round Table ${(event["slots"] as { index: number; card: unknown }[]).map((slot) => `${slot.index} ${card(slot.card)}`).join(", ")}.`;
    case "DECK_EXHAUSTED":
      return `The deck could not fill Round Table slots ${(event["emptySlots"] as number[]).join(", ")}.`;
    case "PENDING_ENCOUNTER":
      return `${card(event["card"])} stays on the table as the pending encounter.`;
    case "HAND_SNAPSHOT":
      return `${String(event["playerId"])} hand size is ${String(event["size"])}.`;
    case "COMPLETE":
      return `Run completed after ${String(event["completedTurns"])} turns.`;
    default:
      return `${event.type}.`;
  }
}

export function highlightFor(event: LooseEvent): Highlight {
  const empty = (): Highlight => ({ cardIds: [], zones: [], slots: [] });
  const id = (value: unknown) => {
    if (!value || typeof value !== "object") return "";
    const card = value as { id?: string };
    return typeof card.id === "string" ? card.id : "";
  };
  switch (event.type) {
    case "SETUP":
      return { cardIds: [], zones: ["player:P1", "player:P2"], slots: [] };
    case "TURN_START":
      return { cardIds: [], zones: [`player:${String(event["playerId"])}`], slots: [] };
    case "EVOLUTION": {
      const player = String(event["playerId"]);
      const zones = [`player:${player}`, `player:${player}:lineage`];
      if (event["source"] === "hand") zones.push(`player:${player}:hand`);
      if (event["source"] === "encounter") zones.push("round-table");
      return { cardIds: [id(event["from"]), id(event["to"])].filter(Boolean), zones, slots: [] };
    }
    case "COLLECT":
      return {
        cardIds: [id(event["card"])].filter(Boolean),
        zones: [`player:${String(event["playerId"])}`, `player:${String(event["playerId"])}:hand`, "round-table"],
        slots: [],
      };
    case "TO_ALTAR":
      return { cardIds: [id(event["card"])].filter(Boolean), zones: ["altar-minors"], slots: [] };
    case "TO_VEIL":
      return { cardIds: [id(event["card"])].filter(Boolean), zones: ["veil"], slots: [] };
    case "WATER_SPEND":
      return {
        cardIds: [id(event["card"])].filter(Boolean),
        zones: [`player:${String(event["playerId"])}:hand`, "veil"],
        slots: [],
      };
    case "RESURFACE":
      return { cardIds: [id(event["card"])].filter(Boolean), zones: ["veil", "altar-minors"], slots: [] };
    case "AIR_SPEND":
      return {
        cardIds: [id(event["card"])].filter(Boolean),
        zones: [`player:${String(event["playerId"])}:hand`, "veil"],
        slots: [],
      };
    case "SWAP":
      return {
        cardIds: [id(event["fromVeil"]), id(event["fromTable"])].filter(Boolean),
        zones: ["round-table", "veil"],
        slots: [Number(event["slot"])],
      };
    case "REFILL": {
      const slots = event["slots"] as { index: number; card: unknown }[];
      return {
        cardIds: slots.map((slot) => id(slot.card)).filter(Boolean),
        zones: ["round-table"],
        slots: slots.map((slot) => slot.index),
      };
    }
    case "DECK_EXHAUSTED":
      return { cardIds: [], zones: ["round-table", "deck"], slots: event["emptySlots"] as number[] };
    case "PENDING_ENCOUNTER":
      return { cardIds: [id(event["card"])].filter(Boolean), zones: ["pending", "round-table"], slots: [] };
    case "HAND_SNAPSHOT":
      return { cardIds: [], zones: [`player:${String(event["playerId"])}:hand`], slots: [] };
    case "COMPLETE":
      return { cardIds: [], zones: ["metrics"], slots: [] };
    default:
      return empty();
  }
}

function altarLine(reason: string, card: string): string {
  if (reason === "uncollected") return `${card} entered the altar because it was not collected.`;
  if (reason === "unused-encounter") return `${card} entered the altar because the encounter was not used.`;
  if (reason === "resurface") return `${card} entered the altar from the Veil.`;
  return `${card} entered the altar.`;
}

function veilLine(reason: string, card: string): string {
  if (reason === "altar-overflow") return `${card} moved from the altar to the Veil because the altar was full.`;
  if (reason === "spend") return `${card} was spent onto the Veil.`;
  if (reason === "swap-out") return `${card} left the Round Table for the Veil.`;
  return `${card} entered the Veil.`;
}

function label(value: unknown): string {
  if (!value || typeof value !== "object") return "a card";
  const card = value as { rank?: number; element?: string };
  if (typeof card.rank !== "number" || typeof card.element !== "string") return "a card";
  return formatCard({ rank: card.rank, element: card.element as Element });
}
