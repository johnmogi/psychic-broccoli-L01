import type { MajorCard, MinorCard } from "../cards.js";

export type SnapCard = MinorCard | MajorCard;

export interface BoardSnap {
  status: "running" | "completed";
  completedTurns: number;
  activePlayerIndex: number;
  players: { id: "P1" | "P2"; lineage: MinorCard[]; hand: MinorCard[] }[];
  deck: SnapCard[];
  roundTable: (SnapCard | null)[];
  pendingCardId: string | null;
  altarMinors: MinorCard[];
  altarMajor: MajorCard | null;
  veil: SnapCard[];
  pd: MajorCard | null;
  teamMilestones: number;
}

interface BoardSource {
  status: "running" | "completed";
  completedTurns: number;
  activePlayerIndex: number;
  players: { id: "P1" | "P2"; lineage: MinorCard[]; hand: MinorCard[] }[];
  deck: readonly SnapCard[];
  roundTable: readonly (SnapCard | null)[];
  pendingCardId?: string | null;
  altar: { minors: MinorCard[]; major?: MajorCard | null };
  veil: readonly SnapCard[];
  pd?: MajorCard | null;
  teamMilestones?: number;
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
      lineage: player.lineage.map(copyMinor),
      hand: player.hand.map(copyMinor),
    })),
    deck: state.deck.map(copyCard),
    roundTable: state.roundTable.map((card) => (card ? copyCard(card) : null)),
    pendingCardId: state.pendingCardId ?? null,
    altarMinors: state.altar.minors.map(copyMinor),
    altarMajor: state.altar.major ? copyMajor(state.altar.major) : null,
    veil: state.veil.map(copyCard),
    pd: state.pd ? copyMajor(state.pd) : null,
    teamMilestones: state.teamMilestones ?? 0,
  };
}

function copyCard(card: SnapCard): SnapCard {
  return { ...card };
}

function copyMinor(card: MinorCard): MinorCard {
  return { ...card };
}

function copyMajor(card: MajorCard): MajorCard {
  return { ...card };
}
