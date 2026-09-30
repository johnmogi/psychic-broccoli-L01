import type { MinorCard } from "../cards.js";

export interface BoardSnap {
  status: "running" | "completed";
  completedTurns: number;
  activePlayerIndex: number;
  players: { id: "P1" | "P2"; lineage: MinorCard[]; hand: MinorCard[] }[];
  deck: MinorCard[];
  roundTable: (MinorCard | null)[];
  pendingCardId: string | null;
  altarMinors: MinorCard[];
  veil: MinorCard[];
}

interface BoardSource {
  status: "running" | "completed";
  completedTurns: number;
  activePlayerIndex: number;
  players: { id: "P1" | "P2"; lineage: MinorCard[]; hand: MinorCard[] }[];
  deck: MinorCard[];
  roundTable: readonly (MinorCard | null)[];
  pendingCardId?: string | null;
  altar: { minors: MinorCard[] };
  veil: MinorCard[];
}

let recording: BoardSnap[] | null = null;

/** Called by the engines after each event. No-op unless a timeline capture is open. */
export function noteBoard(state: BoardSource): void {
  if (!recording) return;
  recording.push(boardFromState(state));
}

export function captureFrames<T>(run: () => T): { result: T; frames: BoardSnap[] } {
  if (recording) throw new Error("Timeline capture is already open");
  const frames: BoardSnap[] = [];
  recording = frames;
  try {
    return { result: run(), frames };
  } finally {
    recording = null;
  }
}

export function boardFromState(state: BoardSource): BoardSnap {
  return {
    status: state.status,
    completedTurns: state.completedTurns,
    activePlayerIndex: state.activePlayerIndex,
    players: state.players.map((player) => ({
      id: player.id,
      lineage: player.lineage.map(copyCard),
      hand: player.hand.map(copyCard),
    })),
    deck: state.deck.map(copyCard),
    roundTable: state.roundTable.map((card) => (card ? copyCard(card) : null)),
    pendingCardId: state.pendingCardId ?? null,
    altarMinors: state.altar.minors.map(copyCard),
    veil: state.veil.map(copyCard),
  };
}

function copyCard(card: MinorCard): MinorCard {
  return { ...card };
}
