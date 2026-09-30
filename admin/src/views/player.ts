import type { PlayerModel } from "../../../src/z01/inspect.js";
import { ZoneView } from "./zone.js";

export function PlayerPanel(player: PlayerModel): HTMLElement {
  const el = document.createElement("section");
  el.className = "player";
  el.dataset.component = "PlayerPanel";
  el.dataset.player = player.id;
  if (player.active) el.dataset.active = "true";

  const head = document.createElement("header");
  const name = document.createElement("h2");
  name.textContent = player.id;
  head.append(name);
  if (player.active) {
    const mark = document.createElement("span");
    mark.textContent = "next";
    head.append(mark);
  }

  const zones = document.createElement("div");
  zones.className = "player-zones";
  for (const zone of player.zones) zones.append(ZoneView(zone));

  el.append(head, zones);
  return el;
}
