import type { CardFace } from "../../../src/z01/inspect.js";

export function CardView(card: CardFace): HTMLElement {
  const el = document.createElement("article");
  el.className = "card";
  if (card.top) el.classList.add("is-top");
  if (card.highlighted) el.classList.add("is-highlight");
  el.dataset.component = "CardView";
  el.dataset.element = card.element;
  el.dataset.cardId = card.cardId;
  if (card.highlighted) el.dataset.highlight = "true";
  el.title = card.title;

  const rank = document.createElement("span");
  rank.className = "card-rank";
  rank.textContent = card.blank ?? card.rankLabel;

  if (card.blank) {
    el.classList.add("is-blank");
    el.append(rank);
    return el;
  }

  const element = document.createElement("span");
  element.className = "card-element";
  element.textContent = card.element;

  el.append(rank, element);
  return el;
}
