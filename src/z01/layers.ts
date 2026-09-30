export const DEFAULT_LAYER = "L02" as const;

export const LAYER_COPY = {
  L01: {
    code: "Z01 / L01",
    name: "Lineage grammar",
    rules: "Lineage grammar only. One pending encounter can move to altar next turn. Other table cards remain.",
  },
  L02: {
    code: "Z02 / L02",
    name: "Collection + Altar + Veil",
    rules: "Collect one table card. Uncollected cards move to altar. Altar overflow goes to Veil. Water resurfaces; Air swaps.",
  },
  L03: {
    code: "Z03 / L03",
    name: "Majors + PD + Eclipse",
    rules: "Majors route through PD. One major waits a turn. Two check Eclipse. Three majors of the same rank in the combined field triangulate. No combat yet.",
  },
} as const;

export function roundTableHint(eventType: string): string | null {
  switch (eventType) {
    case "REFILL":
      return "New cards entered these slots.";
    case "COLLECT":
      return "This card was collected into hand.";
    case "TO_ALTAR":
      return "Uncollected card moved to altar.";
    case "PENDING_ENCOUNTER":
      return "This card waits until next turn.";
    default:
      return null;
  }
}
