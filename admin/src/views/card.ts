import type { CardFace } from "../../../src/z01/inspect.js";

export function CardView(card: CardFace): HTMLElement {
  const el = document.createElement("article");
  el.className = "card";
  el.dataset.component = "CardView";
  el.dataset.element = card.element;
  el.title = card.title;

  const rank = document.createElement("span");
  rank.className = "card-rank";
  rank.textContent = card.rankLabel;

  const element = document.createElement("span");
  element.className = "card-element";
  element.textContent = card.element;

  el.append(rank, element);
  return el;
}
