import { elementColor, type MinorCard } from "./cards.js";
import type { L01Config } from "./config.js";

export function isLegalEvolution(current: MinorCard, offered: MinorCard, config: Pick<L01Config, "alignmentRule" | "maxJump">): boolean {
  if (offered.rank <= current.rank) return false;
  if (offered.rank - current.rank > config.maxJump) return false;
  if (config.alignmentRule === "sameElement") return offered.element === current.element;
  return elementColor(offered.element) === elementColor(current.element);
}

export function alignmentMatch(current: MinorCard, offered: MinorCard): "element" | "color" {
  return current.element === offered.element ? "element" : "color";
}
