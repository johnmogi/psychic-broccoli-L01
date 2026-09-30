import type { ZoneModel } from "../../../src/z01/inspect.js";
import { CardView } from "./card.js";

export function ZoneView(zone: ZoneModel): HTMLElement {
  const el = document.createElement("section");
  el.className = zone.highlighted ? "zone is-highlight" : "zone";
  el.dataset.component = "ZoneView";
  el.dataset.zone = zone.id;
  if (zone.highlighted) el.dataset.highlight = "true";

  const head = document.createElement("header");
  const title = document.createElement("h3");
  title.textContent = zone.title;
  const count = document.createElement("span");
  count.textContent = String(zone.cards.length);
  head.append(title, count);

  const body = document.createElement("div");
  body.className = "zone-cards";
  if (zone.cards.length === 0) {
    const empty = document.createElement("p");
    empty.className = "zone-empty";
    empty.textContent = "empty";
    body.append(empty);
  } else {
    for (const card of zone.cards) body.append(CardView(card));
  }

  el.append(head);
  if (zone.hint) {
    const hint = document.createElement("p");
    hint.className = "zone-hint";
    hint.textContent = zone.hint;
    el.append(hint);
  }
  el.append(body);
  return el;
}
